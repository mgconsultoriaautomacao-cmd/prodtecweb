"""
sync_service.py — Sincronização bidirecional com o Supabase
Equivalente ao src/services/syncService.js do Electron.
Usa requests (HTTP) ao invés de fetch do Node.
"""
import sqlite3
import time
import requests
from db_python import get_db, rows_to_list, now_ms

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _get_headers(key: str, tenant_id: str = None, auth_token: str = None) -> dict:
    h = {
        'apikey': key,
        'Authorization': f'Bearer {auth_token}' if (auth_token and '.' in auth_token) else f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }
    if tenant_id:
        h['x-tenant-id'] = tenant_id
    return h


def _get_config(conn: sqlite3.Connection) -> dict:
    rows = conn.execute(
        "SELECT key, value FROM config WHERE key IN ('supabase_url','supabase_key','tenant_id','auth_token','auth_refresh_token')"
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def _refresh_token(conn: sqlite3.Connection, config: dict) -> str | None:
    url = (config.get('supabase_url') or '').rstrip('/')
    key = config.get('supabase_key')
    refresh = config.get('auth_refresh_token')
    if not url or not key or not refresh:
        return None
    try:
        res = requests.post(
            f'{url}/auth/v1/token?grant_type=refresh_token',
            headers={'apikey': key, 'Content-Type': 'application/json'},
            json={'refresh_token': refresh},
            timeout=10
        )
        if res.ok:
            data = res.json()
            new_token   = data['access_token']
            new_refresh = data['refresh_token']
            conn.execute(
                "INSERT INTO config(key,value) VALUES('auth_token',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (new_token,)
            )
            conn.execute(
                "INSERT INTO config(key,value) VALUES('auth_refresh_token',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (new_refresh,)
            )
            conn.commit()
            print('Sync: Token renovado com sucesso.')
            return new_token
    except Exception as e:
        print(f'Sync: Erro ao renovar token: {e}')
    return None


def _dbrun(conn: sqlite3.Connection, sql: str, params=()):
    conn.execute(sql, params)
    conn.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# UPLOAD (Local → Supabase)
# ═══════════════════════════════════════════════════════════════════════════════
def sync_to_supabase(conn: sqlite3.Connection):
    config = _get_config(conn)
    if not config.get('supabase_url') or not config.get('supabase_key'):
        print('Sync: Credenciais ausentes. Upload pulado.')
        return

    url       = config['supabase_url'].rstrip('/')
    key       = config['supabase_key']
    tenant_id = config.get('tenant_id')
    auth_token = config.get('auth_token')
    headers   = _get_headers(key, tenant_id, auth_token)

    print(f'Sync [up]: Iniciando upload para {url}...')

    # ── 1. Scan Events ────────────────────────────────────────────────────────
    scans = conn.execute("""
        SELECT s.*, e.name as employee_name,
               w.name as weight_name, w.weight_kg,
               p.code as parcel_code, f.name as fruit_name, v.name as variety_name
        FROM scan_events s
        LEFT JOIN employees e ON s.employee_id=e.id
        LEFT JOIN box_weights w ON s.weight_id=w.id
        LEFT JOIN parcels p ON s.parcel_id=p.id
        LEFT JOIN fruits f ON s.fruit_id=f.id
        LEFT JOIN varieties v ON s.variety_id=v.id
        WHERE s.synced=0 LIMIT 100
    """).fetchall()

    if scans:
        body = [{
            'local_id': s['id'],
            'ts': _ms_to_iso(s['ts']),
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

        res = _post_with_retry(url, '/rest/v1/production_scans', body, headers, conn, config)
        if res and res.ok:
            ids = ','.join(str(s['id']) for s in scans)
            _dbrun(conn, f'UPDATE scan_events SET synced=1 WHERE id IN ({ids})')
            print(f'Sync [up]: {len(scans)} scans enviados.')
        else:
            _log_error(res, 'production_scans', 'up')

    # ── 2. Quality Audits ─────────────────────────────────────────────────────
    audits = conn.execute("""
        SELECT q.*, p.remote_id as parcel_remote_id, e.barcode as employee_barcode
        FROM quality_audits q
        LEFT JOIN parcels p ON q.parcel_id=p.id
        LEFT JOIN employees e ON q.employee_id=e.id
        WHERE q.synced=0 LIMIT 100
    """).fetchall()

    if audits:
        body = [{
            'ts': _ms_to_iso(q['ts']),
            'station_id': q['station_id'],
            'employee_barcode': q['employee_barcode'],
            'penalty_boxes': q['penalty_boxes'],
            'reason': q['reason'],
            'issue_type': q['issue_type'],
            'parcel_id': q['parcel_remote_id'],
            'tenant_id': tenant_id,
            'inspector_name': 'Desktop App',
        } for q in audits]
        res = _post_with_retry(url, '/rest/v1/quality_audits', body, headers, conn, config)
        if res and res.ok:
            ids = ','.join(str(q['id']) for q in audits)
            _dbrun(conn, f'UPDATE quality_audits SET synced=1 WHERE id IN ({ids})')
            print(f'Sync [up]: {len(audits)} auditorias enviadas.')

    # ── 3. Dicionários (Employees, Fruits, Varieties, Parcels, BoxWeights) ────
    _upload_dict(conn, url, 'employees', headers, tenant_id,
        "SELECT * FROM employees WHERE synced=0 LIMIT 100",
        lambda e: {**(({'id': e['remote_id']} if e['remote_id'] else {})),
                   'tenant_id': tenant_id, 'barcode': e['barcode'], 'name': e['name'],
                   'role': e['role'], 'active': bool(e['active']), 'photo_path': e['photo_path']},
        'barcode', 'id', 'on_conflict=barcode,role')

    _upload_dict(conn, url, 'fruits', headers, tenant_id,
        "SELECT * FROM fruits WHERE synced=0 LIMIT 100",
        lambda f: {**(({'id': f['remote_id']} if f['remote_id'] else {})),
                   'tenant_id': tenant_id, 'name': f['name'], 'active': bool(f['active'])},
        'name', 'id', 'on_conflict=name')

    _upload_dict(conn, url, 'varieties', headers, tenant_id,
        "SELECT * FROM varieties WHERE synced=0 LIMIT 100",
        lambda v: {**(({'id': v['remote_id']} if v['remote_id'] else {})),
                   'tenant_id': tenant_id, 'name': v['name'], 'active': bool(v['active'])},
        'name', 'id', 'on_conflict=name')

    _upload_dict(conn, url, 'parcels', headers, tenant_id,
        "SELECT * FROM parcels WHERE synced=0 LIMIT 100",
        lambda p: {**(({'id': p['remote_id']} if p['remote_id'] else {})),
                   'tenant_id': tenant_id, 'code': p['code'], 'active': bool(p['active'])},
        'code', 'id', 'on_conflict=code')

    _upload_dict(conn, url, 'box_weights', headers, tenant_id,
        "SELECT * FROM box_weights WHERE synced=0 LIMIT 100",
        lambda w: {**(({'id': w['remote_id']} if w['remote_id'] else {})),
                   'tenant_id': tenant_id, 'name': w['name'], 'weight_kg': w['weight_kg'], 'active': bool(w['active'])},
        'name', 'id', 'on_conflict=name')

    print('Sync [up]: Ciclo de upload concluído.')


def _upload_dict(conn, base_url, table, headers, tenant_id, sql, map_fn, match_field, id_field='id', conflict_param='on_conflict=name'):
    rows = conn.execute(sql).fetchall()
    if not rows:
        return
    try:
        body = [map_fn(dict(r)) for r in rows]
        res = requests.post(
            f'{base_url}/rest/v1/{table}?{conflict_param}',
            headers={**headers, 'Prefer': 'return=representation,resolution=merge-duplicates'},
            json=body, timeout=15
        )
        if res.ok:
            returned = res.json()
            for rem in returned:
                match_val = rem.get(match_field)
                remote_id = rem.get(id_field)
                if remote_id:
                    conn.execute(f"UPDATE {table} SET remote_id=?, synced=1 WHERE {match_field}=?", (remote_id, match_val))
                else:
                    conn.execute(f"UPDATE {table} SET synced=1 WHERE {match_field}=?", (match_val,))
            conn.commit()
            print(f'Sync [up]: {len(rows)} registros enviados para {table}.')
        else:
            _log_error(res, table, 'up')
    except Exception as e:
        print(f'Sync [up]: Erro em {table}: {e}')


# ═══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD (Supabase → Local)
# ═══════════════════════════════════════════════════════════════════════════════
def sync_from_supabase(conn: sqlite3.Connection, on_auth_error=None):
    config = _get_config(conn)
    if not config.get('supabase_url') or not config.get('supabase_key'):
        print('Sync [down]: Credenciais ausentes. Download pulado.')
        return

    url        = config['supabase_url'].rstrip('/')
    key        = config['supabase_key']
    tenant_id  = config.get('tenant_id')
    auth_token = config.get('auth_token')
    tf         = f'&tenant_id=eq.{tenant_id}' if tenant_id else ''
    headers    = _get_headers(key, tenant_id, auth_token)

    print(f'Sync [down]: Iniciando download. TenantID={tenant_id or "GLOBAL"}')

    def get(path: str):
        res = requests.get(f'{url}{path}', headers=headers, timeout=15)
        if res.status_code == 401:
            new_token = _refresh_token(conn, config)
            if new_token:
                config['auth_token'] = new_token
                headers['Authorization'] = f'Bearer {new_token}'
                res = requests.get(f'{url}{path}', headers=headers, timeout=15)
            else:
                if on_auth_error:
                    on_auth_error(401, 'Token inválido')
        return res

    # ── 0. Tenant Config (Metas) ──────────────────────────────────────────────
    if tenant_id:
        r = get(f'/rest/v1/tenants?id=eq.{tenant_id}&select=target_per_hour_packer,target_per_hour_stacker,value_per_box_packer,value_per_box_stacker')
        if r.ok:
            tenants = r.json()
            if tenants:
                t = tenants[0]
                for k, v in t.items():
                    if v is not None:
                        conn.execute("INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, str(v)))
                conn.commit()
                print('Sync [down]: Tenant config (metas) atualizado.')

    # ── 1. Employees ──────────────────────────────────────────────────────────
    r = get(f'/rest/v1/employees?select=*{tf}&limit=5000')
    if r.ok:
        for e in r.json():
            try:
                cur = conn.execute("UPDATE employees SET barcode=?,name=?,role=?,sector=?,active=?,photo_path=?,updated_at=?,synced=1 WHERE remote_id=?",
                    (e['barcode'], e['name'], e['role'], e.get('sector'), 1 if e.get('active') else 0, e.get('photo_path'), now_ms(), e['id']))
                if cur.rowcount == 0:
                    cur2 = conn.execute("UPDATE employees SET name=?,sector=?,active=?,photo_path=?,remote_id=?,updated_at=?,synced=1 WHERE barcode=? AND role=?",
                        (e['name'], e.get('sector'), 1 if e.get('active') else 0, e.get('photo_path'), e['id'], now_ms(), e['barcode'], e['role']))
                    if cur2.rowcount == 0:
                        conn.execute("INSERT OR IGNORE INTO employees(barcode,name,role,sector,active,photo_path,remote_id,created_at,updated_at,synced) VALUES(?,?,?,?,?,?,?,?,?,1)",
                            (e['barcode'], e['name'], e['role'], e.get('sector'), 1 if e.get('active') else 0, e.get('photo_path'), e['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro employee {e.get("name")}: {ex}')
        conn.commit()
        print(f'Sync [down]: Employees atualizados.')

    # ── 2. Box Weights ────────────────────────────────────────────────────────
    r = get(f'/rest/v1/box_weights?select=*{tf}&limit=5000')
    if r.ok:
        for w in r.json():
            try:
                conn.execute("""
                    INSERT INTO box_weights(name,weight_kg,active,remote_id,created_at,updated_at)
                    VALUES(?,?,?,?,?,?)
                    ON CONFLICT(remote_id) DO UPDATE SET
                      name=excluded.name, weight_kg=excluded.weight_kg,
                      active=excluded.active, updated_at=excluded.updated_at, synced=1
                    WHERE synced=1 OR excluded.updated_at > box_weights.updated_at
                """, (w['name'], w['weight_kg'], 1 if w.get('active') else 0, w['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro box_weight {w.get("name")}: {ex}')
        conn.commit()

    # ── 3. Quality Audits ─────────────────────────────────────────────────────
    r = get(f'/rest/v1/quality_audits?select=*&order=ts.desc&limit=100{tf}')
    if r.ok:
        for q in r.json():
            try:
                local_emp = conn.execute("SELECT id FROM employees WHERE remote_id=? OR barcode=?",
                    (q.get('employee_id'), q.get('employee_barcode') or q.get('employee_id'))).fetchone()
                if local_emp:
                    conn.execute("""
                        INSERT INTO quality_audits(ts,station_id,employee_id,parcel_id,penalty_boxes,issue_type,reason,remote_id,synced)
                        VALUES(?,?,?,(SELECT id FROM parcels WHERE remote_id=?),?,?,?,?,1)
                        ON CONFLICT(remote_id) DO UPDATE SET
                          penalty_boxes=excluded.penalty_boxes, reason=excluded.reason, synced=1
                    """, (_iso_to_ms(q.get('ts')),
                          q['station_id'], local_emp[0], q.get('parcel_id'),
                          q['penalty_boxes'], q.get('issue_type'), q.get('reason'), q['id']))
            except Exception as ex:
                print(f'Sync [down]: Erro quality_audit {q.get("id")}: {ex}')
        conn.commit()

    # ── 4. Parcels ────────────────────────────────────────────────────────────
    r = get(f'/rest/v1/parcels?select=*{tf}&limit=5000')
    if r.ok:
        for p in r.json():
            try:
                conn.execute("""
                    INSERT INTO parcels(code,active,remote_id,created_at,updated_at,synced)
                    VALUES(?,?,?,?,?,1)
                    ON CONFLICT(remote_id) DO UPDATE SET
                      code=excluded.code, active=excluded.active,
                      updated_at=excluded.updated_at, synced=1
                    WHERE synced=1 OR excluded.updated_at > parcels.updated_at
                """, (p['code'], 1 if p.get('active') else 0, p['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro parcel {p.get("code")}: {ex}')
        conn.commit()
        print(f'Sync [down]: Parcelas atualizadas.')

    # ── 4b. Info Parcelas (Caderno de Campo → Parcelas Desktop) ───────────────
    r = get(f'/rest/v1/info_parcelas?select=*{tf}&limit=5000')
    if r.ok:
        for ip in r.json():
            try:
                parcel_code = ip.get('parcela2') or (f"{ip.get('parcela','')} {ip.get('letra','')}").strip()
                vars_list = [ip.get(f'variedade{i}' if i > 1 else 'variedade') for i in range(1, 6)]
                vars_str = ' / '.join(v for v in vars_list if v)
                full_code = f'{parcel_code} — {vars_str}' if vars_str else parcel_code
                if parcel_code:
                    conn.execute("""
                        INSERT INTO parcels(code,active,remote_id,created_at,updated_at,synced)
                        VALUES(?,?,?,?,?,1)
                        ON CONFLICT(remote_id) DO UPDATE SET
                          code=excluded.code, active=excluded.active, updated_at=excluded.updated_at, synced=1
                    """, (full_code, 0 if ip.get('ativo') is False else 1, ip['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro info_parcela {ip.get("parcela2")}: {ex}')
        conn.commit()
        print('Sync [down]: Info parcelas sincronizadas.')

    # ── 5. Fruits ─────────────────────────────────────────────────────────────
    r = get(f'/rest/v1/fruits?select=*{tf}&limit=5000')
    if r.ok:
        for f_item in r.json():
            try:
                conn.execute("""
                    INSERT INTO fruits(name,active,remote_id,created_at,updated_at)
                    VALUES(?,?,?,?,?)
                    ON CONFLICT(remote_id) DO UPDATE SET
                      name=excluded.name, active=excluded.active, updated_at=excluded.updated_at, synced=1
                    WHERE synced=1 OR excluded.updated_at > fruits.updated_at
                """, (f_item['name'], 1 if f_item.get('active') else 0, f_item['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro fruit: {ex}')
        conn.commit()

    # ── 6. Varieties ──────────────────────────────────────────────────────────
    r = get(f'/rest/v1/varieties?select=*{tf}&limit=5000')
    if r.ok:
        for v in r.json():
            try:
                conn.execute("""
                    INSERT INTO varieties(name,active,remote_id,created_at,updated_at)
                    VALUES(?,?,?,?,?)
                    ON CONFLICT(remote_id) DO UPDATE SET
                      name=excluded.name, active=excluded.active, updated_at=excluded.updated_at, synced=1
                    WHERE synced=1 OR excluded.updated_at > varieties.updated_at
                """, (v['name'], 1 if v.get('active') else 0, v['id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro variety: {ex}')
        conn.commit()

    # ── 7. Barcode Mappings ───────────────────────────────────────────────────
    r = get(f'/rest/v1/barcode_mappings?select=*{tf}')
    if r.ok:
        for bm in r.json():
            try:
                conn.execute("""
                    INSERT INTO barcode_mappings(barcode,employee_id,weight_id,created_at,updated_at)
                    VALUES(?, (SELECT id FROM employees WHERE remote_id=?), (SELECT id FROM box_weights WHERE remote_id=?), ?, ?)
                    ON CONFLICT(barcode) DO UPDATE SET
                      employee_id=excluded.employee_id, weight_id=excluded.weight_id, updated_at=excluded.updated_at
                """, (bm['barcode'], bm['employee_id'], bm['weight_id'], now_ms(), now_ms()))
            except Exception as ex:
                print(f'Sync [down]: Erro barcode_mapping: {ex}')
        conn.commit()

    # ── 8. Parcel Links ───────────────────────────────────────────────────────
    r = get(f'/rest/v1/parcel_links?select=*{tf}')
    if r.ok:
        conn.execute('DELETE FROM parcel_fruit_varieties')
        for pl in r.json():
            if pl.get('variety_id'):
                try:
                    conn.execute("""
                        INSERT OR IGNORE INTO parcel_fruit_varieties(parcel_id,fruit_id,variety_id)
                        VALUES(
                          (SELECT id FROM parcels WHERE remote_id=?),
                          (SELECT id FROM fruits WHERE remote_id=?),
                          (SELECT id FROM varieties WHERE remote_id=?)
                        )
                    """, (pl['parcel_id'], pl['fruit_id'], pl['variety_id']))
                except Exception as ex:
                    print(f'Sync [down]: Erro parcel_link: {ex}')
        conn.commit()

    print('Sync [down]: Ciclo de download concluído.')


# ─── Utilitários ──────────────────────────────────────────────────────────────
def _ms_to_iso(ts_ms) -> str:
    """Converte timestamp em milissegundos para ISO 8601."""
    from datetime import datetime, timezone
    if not ts_ms:
        return None
    try:
        return datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc).isoformat()
    except Exception:
        return None


def _iso_to_ms(ts_val) -> int | None:
    """Converte timestamp ISO 8601 ou string/numérico para milissegundos inteiros."""
    if not ts_val:
        return None
    if isinstance(ts_val, (int, float)):
        return int(ts_val)
    if isinstance(ts_val, str):
        try:
            if ts_val.isdigit():
                return int(ts_val)
            from datetime import datetime, timezone
            clean_ts = ts_val.replace('Z', '+00:00')
            dt = datetime.fromisoformat(clean_ts)
            return int(dt.timestamp() * 1000)
        except Exception:
            return None
    return None


def _post_with_retry(base_url, path, body, headers, conn, config):
    try:
        res = requests.post(f'{base_url}{path}', headers=headers, json=body, timeout=15)
        if res.status_code == 401:
            new_token = _refresh_token(conn, config)
            if new_token:
                headers['Authorization'] = f'Bearer {new_token}'
                res = requests.post(f'{base_url}{path}', headers=headers, json=body, timeout=15)
        return res
    except Exception as e:
        print(f'Sync POST error ({path}): {e}')
        return None


def _log_error(res, table: str, direction: str):
    if res is None:
        print(f'Sync [{direction}]: {table} — sem resposta (timeout/network)')
        return
    try:
        body = res.text[:500]
    except Exception:
        body = '(could not read body)'
    print(f'Sync [{direction}]: {table} falhou. Status: {res.status_code}. Body: {body}')
