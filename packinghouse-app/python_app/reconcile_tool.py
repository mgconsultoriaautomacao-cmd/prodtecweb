"""
reconcile_tool.py — Ferramenta de auditoria e reconciliação (SOMENTE LEITURA)
Compara a quantidade de registros gravados localmente no SQLite com o Supabase.
Uso:
  python reconcile_tool.py
"""
import sys
import sqlite3
import requests
from datetime import datetime, timezone
from pathlib import Path

from db_python import get_db_path
import sync_service


def run_reconciliation():
    db_path = get_db_path()
    print("=" * 70)
    print("PRODTEC PACKINGHOUSE — FERRAMENTA DE RECONCILIAÇÃO (AUDITORIA)")
    print(f"Banco local: {db_path}")
    print("=" * 70)

    if not db_path.exists():
        print(f"ERRO: Banco local não encontrado em {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    config = sync_service._get_config(conn)
    url = config.get('supabase_url')
    key = config.get('supabase_key')
    tenant_id = config.get('tenant_id')
    auth_token = config.get('auth_token')

    if not url or not key:
        print("ERRO: Credenciais Supabase não configuradas no SQLite local.")
        return

    # 1. Estatísticas Locais
    total_local_scans = conn.execute("SELECT COUNT(1) FROM scan_events").fetchone()[0]
    unsynced_scans = conn.execute("SELECT COUNT(1) FROM scan_events WHERE synced=0").fetchone()[0]
    synced_scans = conn.execute("SELECT COUNT(1) FROM scan_events WHERE synced=1").fetchone()[0]

    min_max_local = conn.execute("SELECT MIN(ts), MAX(ts) FROM scan_events").fetchone()
    min_ts_local = sync_service._ms_to_iso(min_max_local[0]) if min_max_local[0] else "Nenhum"
    max_ts_local = sync_service._ms_to_iso(min_max_local[1]) if min_max_local[1] else "Nenhum"

    print("\n[1] ESTATÍSTICAS LOCAIS (SQLite)")
    print(f"  • Total de Scans Registrados : {total_local_scans}")
    print(f"  • Scans já sincronizados     : {synced_scans}")
    print(f"  • Scans pendentes (synced=0) : {unsynced_scans}")
    print(f"  • Primeiro evento local      : {min_ts_local}")
    print(f"  • Último evento local        : {max_ts_local}")

    # 2. Estatísticas Remotas (Supabase)
    print("\n[2] ESTATÍSTICAS REMOTAS (Supabase)")
    headers = sync_service._get_headers(key, tenant_id, auth_token, prefer='count=exact')
    tf = f"&tenant_id=eq.{tenant_id}" if tenant_id else ""

    try:
        r = requests.get(f"{url.rstrip('/')}/rest/v1/production_scans?select=count{tf}", headers=headers, timeout=15)
        if r.ok:
            # PostgREST retorna a contagem exata no header Content-Range (ex: 0-24/25 ou */25)
            cr = r.headers.get('Content-Range') or ''
            remote_count = cr.split('/')[-1] if '/' in cr else 'Desconhecido'
            print(f"  • Total de Scans no Supabase (Tenant {tenant_id or 'GLOBAL'}): {remote_count}")
        else:
            print(f"  • Falha ao consultar Supabase: HTTP {r.status_code}")
    except Exception as e:
        print(f"  • Erro de conexão com Supabase: {e}")

    # 3. Auditoria de integridade do client_event_id
    total_with_client_id = conn.execute("SELECT COUNT(1) FROM scan_events WHERE client_event_id IS NOT NULL").fetchone()[0]
    print("\n[3] AUDITORIA DE IDEMPOTÊNCIA")
    print(f"  • Scans com client_event_id preenchido: {total_with_client_id} de {total_local_scans}")

    print("\n" + "=" * 70)
    print("Reconciliação concluída sem modificações no banco de dados.")
    print("=" * 70)


if __name__ == '__main__':
    run_reconciliation()
