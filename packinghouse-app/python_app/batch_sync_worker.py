"""
batch_sync_worker.py — Worker de sincronização em lote para PRODTEC Packinghouse
- Conexão SQLite própria e isolada (WAL, timeout=10s, busy_timeout=10000ms).
- Upload de scans em lotes de até 500 registros com Prefer: return=minimal.
- Idempotência com client_event_id e on_conflict=tenant_id,client_event_id.
- Intervalo base de 5 minutos com jitter aleatório e gatilho antecipado se >= 500 pendentes.
- Drenagem suave de fila pós-offline (pausa de 3s entre blocos).
"""
import os
import sys
import time
import json
import uuid
import random
import sqlite3
import threading
import requests
from pathlib import Path

from db_python import get_db_path, now_ms
import sync_service

BATCH_SIZE = 500
UPLOAD_INTERVAL_NORMAL = 300.0   # 5 minutos
QUEUE_THRESHOLD_TRIGGER = 500    # Gatilho imediato se atingir 500 pendentes
DRAIN_PAUSE_SECONDS = 3.0        # Pausa suave entre lotes ao esvaziar fila grande


class BatchSyncWorker(threading.Thread):
    def __init__(self, push_event_fn=None, on_auth_error_fn=None):
        super().__init__(name="BatchSyncWorker", daemon=True)
        self._push_event = push_event_fn
        self._on_auth_error = on_auth_error_fn
        self._running = True
        self._force_sync_event = threading.Event()
        self._force_full = False
        self._conn = None
        self._backoff = 15.0
        self._last_upload_time = 0.0

    def stop(self):
        self._running = False
        self._force_sync_event.set()

    def trigger_sync(self, full: bool = False):
        if full:
            self._force_full = True
        self._force_sync_event.set()

    def _get_isolated_conn(self) -> sqlite3.Connection:
        db_path = str(get_db_path())
        conn = sqlite3.connect(db_path, timeout=10.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA journal_mode = WAL')
        conn.execute('PRAGMA synchronous = NORMAL')
        conn.execute('PRAGMA busy_timeout = 10000')
        return conn

    def _emit_status(self, state: str, **kwargs):
        if self._push_event:
            payload = {'state': state, **kwargs}
            self._push_event('sync:status', json.dumps(payload))

    def run(self):
        print("BatchSyncWorker: Iniciado com conexão SQLite isolada.")
        time.sleep(3.0)  # Aguarda inicialização básica do sistema

        try:
            self._conn = self._get_isolated_conn()
        except Exception as e:
            print(f"BatchSyncWorker: Falha ao abrir conexão SQLite isolada: {e}")
            return

        while self._running:
            try:
                # Loop de verificação periódica curta (gatilho antecipado ou espera do intervalo)
                now = time.time()
                is_forced = self._force_sync_event.is_set()
                if is_forced:
                    self._force_sync_event.clear()

                force_full = self._force_full
                self._force_full = False

                # Verifica tamanho da fila local
                unsynced_count = self._count_unsynced_scans()
                time_elapsed = (now - self._last_upload_time)
                # Jitter aleatório de +/- 20s no intervalo normal
                target_interval = UPLOAD_INTERVAL_NORMAL + random.uniform(-20.0, 20.0)

                should_upload = (
                    is_forced or
                    (unsynced_count >= QUEUE_THRESHOLD_TRIGGER) or
                    (time_elapsed >= target_interval)
                )

                if should_upload:
                    self._execute_sync_cycle(force_full_sync=force_full)
                    self._last_upload_time = time.time()

            except Exception as e:
                print(f"BatchSyncWorker: Erro no loop: {e}")

            # Espera curta (5 segundos) ou até acionamento manual
            self._force_sync_event.wait(timeout=5.0)

        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
        print("BatchSyncWorker: Finalizado.")

    def _count_unsynced_scans(self) -> int:
        try:
            row = self._conn.execute("SELECT COUNT(1) FROM scan_events WHERE synced=0").fetchone()
            return int(row[0]) if row else 0
        except Exception:
            return 0

    def _execute_sync_cycle(self, force_full_sync: bool = False):
        self._emit_status('syncing')
        config = sync_service._get_config(self._conn)

        if not config.get('supabase_url') or not config.get('supabase_key'):
            print("BatchSyncWorker: Credenciais Supabase ausentes.")
            self._emit_status('offline', error='Credenciais ausentes')
            return

        try:
            # 1. Upload em Lote de Scans (com esvaziamento suave se houver muitos pendentes)
            self._upload_scans_in_batches(config)

            # 2. Upload de Quality Audits
            self._upload_quality_audits(config)

            # 3. Upload de Cadastros/Dicionários (novos cadastrados localmente)
            self._upload_dictionaries(config)

            # 4. Download (Dicionários a cada 15 min e Mapeiro a cada 2 min com cursor incremental)
            new_scans = sync_service.sync_from_supabase(
                self._conn,
                on_auth_error=self._on_auth_error,
                force_full_sync=force_full_sync
            )
            if new_scans and new_scans > 0 and self._push_event:
                self._push_event('scan:new', json.dumps({'role': 'EMPILHADOR', 'count': new_scans}))

            self._backoff = 15.0
            self._emit_status('synced', lastSync=now_ms())

        except Exception as e:
            print(f"BatchSyncWorker: Falha no ciclo: {e}")
            jitter = random.uniform(1.0, 5.0)
            self._backoff = min(self._backoff * 2.0 + jitter, 300.0)
            self._emit_status('offline', error=str(e), nextRetry=int(self._backoff * 1000))
            time.sleep(self._backoff)

    def _upload_scans_in_batches(self, config: dict):
        url = config['supabase_url'].rstrip('/')
        key = config['supabase_key']
        tenant_id = config.get('tenant_id')
        auth_token = config.get('auth_token')
        endpoint = f"{url}/rest/v1/production_scans?on_conflict=tenant_id,client_event_id"

        headers = {
            'apikey': key,
            'Authorization': f'Bearer {auth_token or key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal,resolution=ignore-duplicates'
        }

        while self._running:
            scans = self._conn.execute(f"""
                SELECT s.*, e.name as employee_name,
                       w.name as weight_name, w.weight_kg,
                       p.code as parcel_code, f.name as fruit_name, v.name as variety_name
                FROM scan_events s
                LEFT JOIN employees e ON s.employee_id=e.id
                LEFT JOIN box_weights w ON s.weight_id=w.id
                LEFT JOIN parcels p ON s.parcel_id=p.id
                LEFT JOIN fruits f ON s.fruit_id=f.id
                LEFT JOIN varieties v ON s.variety_id=v.id
                WHERE s.synced=0 LIMIT {BATCH_SIZE}
            """).fetchall()

            if not scans:
                break

            batch_id = str(uuid.uuid4())
            body = [{
                'client_event_id': s['client_event_id'] or f"{s['station_id']}_{s['ts']}_{s['id']}",
                'batch_id': batch_id,
                'local_id': s['id'],
                'ts': sync_service._ms_to_iso(s['ts']),
                'station_id': s['station_id'],
                'role': s['role'],
                'employee_name': s['employee_name'] or 'DESCONHECIDO',
                'raw_barcode': s['raw_barcode'],
                'weight_name': s['weight_name'] or ('NÃO IDENTIFICADA' if s['caliber'] == 'N/I' else 'PADRAO'),
                'weight_kg': float(s['weight_kg'] or 0),
                'parcel_code': s['parcel_code'],
                'fruit_name': s['fruit_name'],
                'variety_name': s['variety_name'],
                'caliber': s['caliber'],
                'tenant_id': tenant_id,
            } for s in scans]

            res = requests.post(endpoint, headers=headers, json=body, timeout=25)

            if res.status_code == 401:
                new_token = sync_service._refresh_token(self._conn, config)
                if new_token:
                    headers['Authorization'] = f'Bearer {new_token}'
                    res = requests.post(endpoint, headers=headers, json=body, timeout=25)

            if res.status_code in (200, 201, 204):
                ids = ','.join(str(s['id']) for s in scans)
                self._conn.execute(f"UPDATE scan_events SET synced=1 WHERE id IN ({ids})")
                self._conn.commit()
                print(f"BatchSyncWorker: Lote de {len(scans)} scans enviado com sucesso (Batch {batch_id[:8]}).")
                if len(scans) < BATCH_SIZE:
                    break
                # Se há mais lotes para esvaziar, pausa suave para não saturar
                time.sleep(DRAIN_PAUSE_SECONDS)
            else:
                sync_service._log_error(res, 'production_scans', 'up_batch')
                raise RuntimeError(f"HTTP {res.status_code}: {res.text[:100]}")

    def _upload_quality_audits(self, config: dict):
        url = config['supabase_url'].rstrip('/')
        key = config['supabase_key']
        tenant_id = config.get('tenant_id')
        auth_token = config.get('auth_token')
        endpoint = f"{url}/rest/v1/quality_audits?on_conflict=tenant_id,client_event_id"

        headers = {
            'apikey': key,
            'Authorization': f'Bearer {auth_token or key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal,resolution=ignore-duplicates'
        }

        audits = self._conn.execute("""
            SELECT q.*, p.remote_id as parcel_remote_id, e.barcode as employee_barcode
            FROM quality_audits q
            LEFT JOIN parcels p ON q.parcel_id=p.id
            LEFT JOIN employees e ON q.employee_id=e.id
            WHERE q.synced=0 LIMIT 100
        """).fetchall()

        if audits:
            body = [{
                'client_event_id': q['client_event_id'] or f"{q['station_id']}_{q['ts']}_{q['id']}",
                'ts': sync_service._ms_to_iso(q['ts']),
                'station_id': q['station_id'],
                'employee_barcode': q['employee_barcode'],
                'penalty_boxes': q['penalty_boxes'],
                'reason': q['reason'],
                'issue_type': q['issue_type'],
                'parcel_id': q['parcel_remote_id'],
                'tenant_id': tenant_id,
                'inspector_name': 'Desktop App',
            } for q in audits]

            res = requests.post(endpoint, headers=headers, json=body, timeout=20)
            if res.status_code in (200, 201, 204):
                ids = ','.join(str(q['id']) for q in audits)
                self._conn.execute(f"UPDATE quality_audits SET synced=1 WHERE id IN ({ids})")
                self._conn.commit()
                print(f"BatchSyncWorker: {len(audits)} auditorias enviadas.")

    def _upload_dictionaries(self, config: dict):
        url = config['supabase_url'].rstrip('/')
        key = config['supabase_key']
        tenant_id = config.get('tenant_id')
        auth_token = config.get('auth_token')
        headers = sync_service._get_headers(key, tenant_id, auth_token, prefer='return=representation')

        sync_service._upload_dict(self._conn, url, 'employees', headers, tenant_id,
            "SELECT * FROM employees WHERE synced=0 LIMIT 100",
            lambda e: {**(({'id': e['remote_id']} if e['remote_id'] else {})),
                       'tenant_id': tenant_id, 'barcode': e['barcode'], 'name': e['name'],
                       'role': e['role'], 'active': bool(e['active']), 'photo_path': e['photo_path']},
            'barcode', 'id', 'on_conflict=barcode,role')

        sync_service._upload_dict(self._conn, url, 'fruits', headers, tenant_id,
            "SELECT * FROM fruits WHERE synced=0 LIMIT 100",
            lambda f: {**(({'id': f['remote_id']} if f['remote_id'] else {})),
                       'tenant_id': tenant_id, 'name': f['name'], 'active': bool(f['active'])},
            'name', 'id', 'on_conflict=name')

        sync_service._upload_dict(self._conn, url, 'varieties', headers, tenant_id,
            "SELECT * FROM varieties WHERE synced=0 LIMIT 100",
            lambda v: {**(({'id': v['remote_id']} if v['remote_id'] else {})),
                       'tenant_id': tenant_id, 'name': v['name'], 'active': bool(v['active'])},
            'name', 'id', 'on_conflict=name')

        sync_service._upload_dict(self._conn, url, 'parcels', headers, tenant_id,
            "SELECT * FROM parcels WHERE synced=0 LIMIT 100",
            lambda p: {**(({'id': p['remote_id']} if p['remote_id'] else {})),
                       'tenant_id': tenant_id, 'code': p['code'], 'active': bool(p['active'])},
            'code', 'id', 'on_conflict=code')

        sync_service._upload_dict(self._conn, url, 'box_weights', headers, tenant_id,
            "SELECT * FROM box_weights WHERE synced=0 LIMIT 100",
            lambda w: {**(({'id': w['remote_id']} if w['remote_id'] else {})),
                       'tenant_id': tenant_id, 'name': w['name'], 'weight_kg': w['weight_kg'], 'active': bool(w['active'])},
            'name', 'id', 'on_conflict=name')
