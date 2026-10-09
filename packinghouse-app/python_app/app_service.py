"""
app_service.py — Lógica de negócio do PRODTEC Packinghouse em Python
Equivalente direto ao src/services/appService.js do Electron.
Usa sqlite3 da stdlib Python (sem dependencies externas neste módulo).
"""
import time
import math
import json
import requests
from datetime import datetime, timezone, timedelta
from db_python import get_db, rows_to_list, row_to_dict, now_ms

# ─── Constantes de Produção ───────────────────────────────────────────────────
DEFAULT_SUPA_URL = 'https://yiigaohjvvieeooxsban.supabase.co'
DEFAULT_SUPA_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwic'
    'm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.'
    'CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8'
)


# ─── Helpers de tempo ─────────────────────────────────────────────────────────
def hour_start_ms(ts_ms: int) -> int:
    """Início da hora contendo ts_ms (ms)."""
    return ts_ms - (ts_ms % 3_600_000)


def day_start_ms(ts_ms: int) -> int:
    """Início do dia local (meia-noite) contendo ts_ms."""
    dt = datetime.fromtimestamp(ts_ms / 1000)
    midnight = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return int(midnight.timestamp() * 1000)


def iso_date_today() -> str:
    return datetime.now().strftime('%Y-%m-%d')


def start_of_day_ms(date_str: str) -> int:
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    return int(dt.timestamp() * 1000)


def end_of_day_ms(date_str: str) -> int:
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    end = dt.replace(hour=23, minute=59, second=59, microsecond=999000)
    return int(end.timestamp() * 1000)


# ─── Helpers de normalização ──────────────────────────────────────────────────
def norm_role(r: str) -> str:
    return 'EMPILHADOR' if str(r or '').upper() == 'EMPILHADOR' else 'EMBALADOR'


def norm_station(s) -> str:
    return str(s or 'ST01')


def sanitize_num(v, default=0):
    if v is None:
        return default
    try:
        return float(str(v).replace(',', '.'))
    except (ValueError, TypeError):
        return default


# ─── Wrappers de DB ───────────────────────────────────────────────────────────
def _all(sql: str, params=()) -> list:
    conn = get_db()
    cursor = conn.execute(sql, params)
    return [dict(row) for row in cursor.fetchall()]


def _get(sql: str, params=()) -> dict | None:
    conn = get_db()
    cursor = conn.execute(sql, params)
    row = cursor.fetchone()
    return dict(row) if row else None


def _run(sql: str, params=()) -> int:
    """Executa SQL e retorna lastrowid."""
    conn = get_db()
    cursor = conn.execute(sql, params)
    conn.commit()
    return cursor.lastrowid


# ═══════════════════════════════════════════════════════════════════════════════
# HANDLERS — cada função corresponde a um handler IPC do Electron
# ═══════════════════════════════════════════════════════════════════════════════

def config_get_all() -> dict:
    rows = _all('SELECT key, value FROM config')
    return {r['key']: r['value'] for r in rows}


def config_set(obj: dict) -> dict:
    conn = get_db()
    for k, v in (obj or {}).items():
        if v is None or v == 'null' or v == 'undefined':
            conn.execute('DELETE FROM config WHERE key=?', (str(k),))
        else:
            conn.execute(
                "INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (str(k), str(v))
            )
    conn.commit()
    return {'ok': True}


def db_reset() -> dict:
    tables = [
        'employees', 'parcels', 'fruits', 'varieties', 'box_weights',
        'scan_events', 'hourly_stats', 'quality_audits', 'barcode_mappings',
    ]
    conn = get_db()
    for t in tables:
        try:
            conn.execute(f'DELETE FROM {t}')
        except Exception:
            pass
    conn.execute("DELETE FROM config WHERE key IN ('auth_token','auth_refresh_token','user_id','auth_email','tenant_id')")
    conn.commit()
    return {'ok': True}


# ─── Autenticação ─────────────────────────────────────────────────────────────
def auth_login(email: str, password: str) -> dict:
    cfg = config_get_all()
    url = cfg.get('supabase_url') or DEFAULT_SUPA_URL
    key = cfg.get('supabase_key') or DEFAULT_SUPA_KEY

    try:
        res = requests.post(
            f'{url}/auth/v1/token?grant_type=password',
            headers={'apikey': key, 'Content-Type': 'application/json'},
            json={'email': email, 'password': password},
            timeout=10
        )
        data = res.json()
        if not res.ok:
            return {'ok': False, 'error': data.get('error_description', data.get('msg', 'AUTH_FAILED'))}

        access_token  = data['access_token']
        refresh_token = data['refresh_token']
        user          = data['user']

        # Busca tenant vinculado ao user
        t_res = requests.get(
            f'{url}/rest/v1/tenant_users?user_id=eq.{user["id"]}&select=tenant_id,role,whatsapp',
            headers={'apikey': key, 'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        tenants = t_res.json() if t_res.ok else []
        if not tenants:
            return {'ok': False, 'error': 'Usuário não vinculado a empresa.'}

        config_set({
            'supabase_url':      url,
            'supabase_key':      key,
            'auth_token':        access_token,
            'auth_refresh_token': refresh_token,
            'user_id':           user['id'],
            'auth_email':        email,
            'tenant_id':         tenants[0]['tenant_id'],
            'tenant_role':       tenants[0].get('role', ''),
            'tenant_whatsapp':   tenants[0].get('whatsapp', ''),
        })
        return {'ok': True, 'user': user}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def auth_check() -> dict:
    cfg = config_get_all()
    token = cfg.get('auth_token')
    if not token or token in ('null', 'undefined', ''):
        return {'ok': False}
    # Tenta renovar via refresh token
    refresh = cfg.get('auth_refresh_token')
    if refresh and refresh not in ('null', ''):
        url = cfg.get('supabase_url') or DEFAULT_SUPA_URL
        key = cfg.get('supabase_key') or DEFAULT_SUPA_KEY
        try:
            res = requests.post(
                f'{url}/auth/v1/token?grant_type=refresh_token',
                headers={'apikey': key, 'Content-Type': 'application/json'},
                json={'refresh_token': refresh},
                timeout=10
            )
            if res.ok:
                d = res.json()
                config_set({'auth_token': d['access_token'], 'auth_refresh_token': d['refresh_token']})
                return {'ok': True, 'email': cfg.get('auth_email', '')}
            else:
                config_set({'auth_token': None, 'auth_refresh_token': None})
                return {'ok': False}
        except Exception:
            return {'ok': False}
    return {'ok': False}


# ─── Funcionários ─────────────────────────────────────────────────────────────
def employees_list() -> list:
    return _all('SELECT id, barcode, name, role, photo_path, active FROM employees ORDER BY active DESC, name ASC')


def employees_add(barcode: str, name: str, role: str, photo_path=None) -> dict:
    b, n, r = str(barcode or '').strip(), str(name or '').strip(), norm_role(role)
    if not b or not n:
        return {'ok': False, 'error': 'MISSING_FIELDS'}
    ts = now_ms()
    _run("""
        INSERT INTO employees(barcode,name,role,photo_path,active,created_at,updated_at,synced)
        VALUES(?,?,?,?,1,?,?,0)
        ON CONFLICT(barcode,role) DO UPDATE SET
          name=excluded.name, photo_path=excluded.photo_path,
          active=1, updated_at=excluded.updated_at, synced=0
    """, (b, n, r, photo_path, ts, ts))
    return {'ok': True}


def employees_update(id, barcode, name, role, photo_path=None, active=1) -> dict:
    eid, b, n, r = int(id), str(barcode or '').strip(), str(name or '').strip(), norm_role(role)
    if not eid or not b or not n:
        return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("UPDATE employees SET barcode=?,name=?,role=?,photo_path=?,active=?,updated_at=?,synced=0 WHERE id=?",
         (b, n, r, photo_path, int(bool(active)), now_ms(), eid))
    return {'ok': True}


def employees_delete(id) -> dict:
    _run("UPDATE employees SET active=0, updated_at=?, synced=0 WHERE id=?", (now_ms(), int(id)))
    return {'ok': True}


# ─── Frutas ───────────────────────────────────────────────────────────────────
def fruits_list() -> list:
    return _all('SELECT id, name, active FROM fruits ORDER BY active DESC, name ASC')


def fruits_add(name: str) -> dict:
    n = str(name or '').strip()
    if not n: return {'ok': False, 'error': 'MISSING_NAME'}
    ts = now_ms()
    _run("INSERT INTO fruits(name,active,created_at,updated_at,synced) VALUES(?,1,?,?,0) ON CONFLICT(name) DO UPDATE SET active=1,updated_at=excluded.updated_at,synced=0", (n, ts, ts))
    return {'ok': True}


def fruits_update(id, name, active=1) -> dict:
    fid, n = int(id), str(name or '').strip()
    if not fid or not n: return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("UPDATE fruits SET name=?,active=?,updated_at=?,synced=0 WHERE id=?", (n, int(bool(active)), now_ms(), fid))
    return {'ok': True}


def fruits_delete(id) -> dict:
    _run("UPDATE fruits SET active=0,updated_at=?,synced=0 WHERE id=?", (now_ms(), int(id)))
    return {'ok': True}


# ─── Variedades ───────────────────────────────────────────────────────────────
def varieties_list() -> list:
    return _all('SELECT id, name, active FROM varieties ORDER BY active DESC, name ASC')


def varieties_add(name: str) -> dict:
    n = str(name or '').strip()
    if not n: return {'ok': False, 'error': 'MISSING_NAME'}
    ts = now_ms()
    _run("INSERT INTO varieties(name,active,created_at,updated_at,synced) VALUES(?,1,?,?,0) ON CONFLICT(name) DO UPDATE SET active=1,updated_at=excluded.updated_at,synced=0", (n, ts, ts))
    return {'ok': True}


def varieties_update(id, name, active=1) -> dict:
    vid, n = int(id), str(name or '').strip()
    if not vid or not n: return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("UPDATE varieties SET name=?,active=?,updated_at=?,synced=0 WHERE id=?", (n, int(bool(active)), now_ms(), vid))
    return {'ok': True}


def varieties_delete(id) -> dict:
    _run("UPDATE varieties SET active=0,updated_at=?,synced=0 WHERE id=?", (now_ms(), int(id)))
    return {'ok': True}


# ─── Parcelas ────────────────────────────────────────────────────────────────
def parcels_list() -> list:
    return _all('SELECT id, code, active FROM parcels ORDER BY active DESC, code ASC')


def parcels_add(code: str) -> dict:
    c = str(code or '').strip().upper()
    if not c: return {'ok': False, 'error': 'MISSING_CODE'}
    ts = now_ms()
    _run("INSERT INTO parcels(code,active,created_at,updated_at,synced) VALUES(?,1,?,?,0) ON CONFLICT(code) DO UPDATE SET active=1,updated_at=excluded.updated_at,synced=0", (c, ts, ts))
    return {'ok': True}


def parcels_update(id, code, active=1) -> dict:
    pid, c = int(id), str(code or '').strip().upper()
    if not pid or not c: return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("UPDATE parcels SET code=?,active=?,updated_at=?,synced=0 WHERE id=?", (c, int(bool(active)), now_ms(), pid))
    return {'ok': True}


def parcels_delete(id) -> dict:
    _run("UPDATE parcels SET active=0,updated_at=?,synced=0 WHERE id=?", (now_ms(), int(id)))
    return {'ok': True}


def parcel_pairs_list(parcel_id) -> list:
    pid = int(parcel_id or 0)
    if not pid: return []
    return _all("""
        SELECT pfv.fruit_id as fruitId, f.name as fruitName,
               pfv.variety_id as varietyId, v.name as varietyName
        FROM parcel_fruit_varieties pfv
        JOIN fruits f ON f.id=pfv.fruit_id
        JOIN varieties v ON v.id=pfv.variety_id
        WHERE pfv.parcel_id=? ORDER BY f.name, v.name
    """, (pid,))


def parcel_pair_add(parcel_id, fruit_id, variety_id) -> dict:
    pid, fid, vid = int(parcel_id or 0), int(fruit_id or 0), int(variety_id or 0)
    if not pid or not fid or not vid: return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("INSERT OR IGNORE INTO parcel_fruit_varieties(parcel_id,fruit_id,variety_id) VALUES(?,?,?)", (pid, fid, vid))
    return {'ok': True}


def parcel_pair_remove(parcel_id, fruit_id, variety_id) -> dict:
    _run("DELETE FROM parcel_fruit_varieties WHERE parcel_id=? AND fruit_id=? AND variety_id=?",
         (int(parcel_id), int(fruit_id), int(variety_id)))
    return {'ok': True}


import unicodedata

def _norm(s: str) -> str:
    if not s: return ''
    return ''.join(c for c in unicodedata.normalize('NFD', str(s)) if unicodedata.category(c) != 'Mn').upper().strip()


def parcel_fruits_list(parcel_id) -> list:
    pid = int(parcel_id or 0)
    if pid:
        # 1. Trava de segurança: busca frutas vinculadas diretamente na tabela de vínculos
        linked = _all("""
            SELECT DISTINCT f.id, f.name FROM parcel_fruit_varieties pfv
            JOIN fruits f ON f.id=pfv.fruit_id WHERE pfv.parcel_id=? AND f.active=1 ORDER BY f.name
        """, (pid,))
        if linked:
            return linked

        # 2. Análise inteligente pelo nome/código do talhão (ex: "P01 — MELAO / CANTALOUPE")
        parcel = _one("SELECT code FROM parcels WHERE id=?", (pid,))
        if parcel and parcel.get('code'):
            code_norm = _norm(parcel['code'])
            all_fruits = _all("SELECT id, name FROM fruits WHERE active=1 ORDER BY name")
            matched = [f for f in all_fruits if _norm(f['name']) in code_norm or code_norm.startswith(_norm(f['name']))]
            if matched:
                return matched

    # Se o talhão ainda não possuir vínculos específicos cadastrados, retorna frutas ativas (sem travar a operação)
    return _all('SELECT id, name FROM fruits WHERE active=1 ORDER BY name')


def parcel_varieties_list(parcel_id, fruit_id) -> list:
    pid, fid = int(parcel_id or 0), int(fruit_id or 0)
    if pid and fid:
        # 1. Trava de segurança: apenas variedades cadastradas para este talhão e esta fruta
        linked = _all("""
            SELECT DISTINCT v.id, v.name FROM parcel_fruit_varieties pfv
            JOIN varieties v ON v.id=pfv.variety_id WHERE pfv.parcel_id=? AND pfv.fruit_id=? AND v.active=1
            ORDER BY v.name
        """, (pid, fid))
        if linked:
            return linked

        # 2. Análise inteligente pelo código do talhão (ex: "P01 — MELAO / CANTALOUPE")
        parcel = _one("SELECT code FROM parcels WHERE id=?", (pid,))
        if parcel and parcel.get('code'):
            code_norm = _norm(parcel['code'])
            all_vars = _all("SELECT id, name FROM varieties WHERE active=1 ORDER BY name")
            matched = [v for v in all_vars if _norm(v['name']) in code_norm]
            if matched:
                return matched

    if fid:
        return _all('SELECT id, name FROM varieties WHERE active=1 ORDER BY name')
    return []





# ─── Pesos de Caixa ───────────────────────────────────────────────────────────
def box_weights_list() -> list:
    return _all('SELECT id, name, weight_kg, active FROM box_weights ORDER BY active DESC, weight_kg ASC, name ASC')


def box_weights_add(name: str, weight_kg) -> dict:
    n = str(name or '').strip()
    w = float(weight_kg or 0)
    if not n: return {'ok': False, 'error': 'MISSING_NAME'}
    ts = now_ms()
    _run("INSERT INTO box_weights(name,weight_kg,active,created_at,updated_at,synced) VALUES(?,?,1,?,?,0) ON CONFLICT(name) DO UPDATE SET weight_kg=excluded.weight_kg,active=1,updated_at=excluded.updated_at,synced=0",
         (n, w, ts, ts))
    return {'ok': True}


def box_weights_update(id, name, weight_kg, active=1) -> dict:
    wid, n, w = int(id), str(name or '').strip(), float(weight_kg or 0)
    if not wid or not n: return {'ok': False, 'error': 'MISSING_FIELDS'}
    _run("UPDATE box_weights SET name=?,weight_kg=?,active=?,updated_at=?,synced=0 WHERE id=?",
         (n, w, int(bool(active)), now_ms(), wid))
    return {'ok': True}


def box_weights_delete(id) -> dict:
    _run("UPDATE box_weights SET active=0,updated_at=?,synced=0 WHERE id=?", (now_ms(), int(id)))
    return {'ok': True}


# ─── Barcode Mappings ─────────────────────────────────────────────────────────
def barcode_mappings_list() -> list:
    return _all("""
        SELECT bm.barcode, bm.employee_id as employeeId, e.name as employeeName,
               bm.weight_id as weightId, w.name as weightName
        FROM barcode_mappings bm
        JOIN employees e ON e.id=bm.employee_id
        JOIN box_weights w ON w.id=bm.weight_id
        ORDER BY bm.updated_at DESC
    """)


def barcode_mappings_add(barcode: str, employee_id, weight_id) -> dict:
    b, eid, wid = str(barcode or '').strip(), int(employee_id or 0), int(weight_id or 0)
    if not b or not eid or not wid: return {'ok': False, 'error': 'MISSING_FIELDS'}
    ts = now_ms()
    _run("INSERT INTO barcode_mappings(barcode,employee_id,weight_id,created_at,updated_at,synced) VALUES(?,?,?,?,?,0) ON CONFLICT(barcode) DO UPDATE SET employee_id=excluded.employee_id,weight_id=excluded.weight_id,updated_at=excluded.updated_at,synced=0",
         (b, eid, wid, ts, ts))
    return {'ok': True}


def barcode_mappings_delete(barcode: str) -> dict:
    _run("DELETE FROM barcode_mappings WHERE barcode=?", (barcode,))
    return {'ok': True}


# ─── Contexto da Estação ──────────────────────────────────────────────────────
def context_get(station_id='ST01', role='EMBALADOR') -> dict:
    st, rl = norm_station(station_id), norm_role(role)
    row = _get("SELECT station_id,role,parcel_id,fruit_id,variety_id,weight_id FROM station_context WHERE station_id=? AND role=?", (st, rl))
    return row or {'station_id': st, 'role': rl, 'parcel_id': None, 'fruit_id': None, 'variety_id': None, 'weight_id': None}


def context_set(station_id='ST01', role='EMBALADOR', parcel_id=None, fruit_id=None, variety_id=None, weight_id=None) -> dict:
    st, rl = norm_station(station_id), norm_role(role)
    _run("""
        INSERT INTO station_context(station_id,role,parcel_id,fruit_id,variety_id,weight_id,updated_at)
        VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(station_id,role) DO UPDATE SET
          parcel_id=excluded.parcel_id, fruit_id=excluded.fruit_id,
          variety_id=excluded.variety_id, weight_id=excluded.weight_id,
          updated_at=excluded.updated_at
    """, (st, rl,
          int(parcel_id) if parcel_id else None,
          int(fruit_id) if fruit_id else None,
          int(variety_id) if variety_id else None,
          int(weight_id) if weight_id else None,
          now_ms()))
    return {'ok': True}


# ─── Scan Submit ──────────────────────────────────────────────────────────────
def scan_submit(station_id='ST01', scanner_id='SC01', role='EMBALADOR',
                raw_barcode='', caliber=None, cv_box_model=None, cv_weight=None,
                cv_unidentified=False) -> dict:
    ts = now_ms()
    st, sc, rl = norm_station(station_id), str(scanner_id or 'SC01'), norm_role(role)
    raw = str(raw_barcode or '').strip()
    if not raw:
        return {'ok': False, 'error': 'EMPTY_BARCODE'}

    # Anti-duplicata (1 segundo)
    last = _get("SELECT ts, raw_barcode FROM scan_events WHERE station_id=? AND scanner_id=? ORDER BY ts DESC LIMIT 1", (st, sc))
    if last and last['raw_barcode'] == raw and (ts - last['ts']) < 1000:
        return {'ok': True, 'ignored': True, 'reason': 'DUPLICATE_SCAN'}

    ctx = context_get(st, rl)

    # Tenta mapping (barcode combinado)
    mapping = _get("""
        SELECT m.employee_id, m.weight_id, e.name, e.photo_path
        FROM barcode_mappings m
        JOIN employees e ON e.id=m.employee_id
        WHERE m.barcode=? AND e.role=? AND e.active=1
    """, (raw, rl))

    emp, weight_id = None, None
    if mapping:
        weight_id = mapping['weight_id']
        emp = {'id': mapping['employee_id'], 'name': mapping['name'], 'photo_path': mapping['photo_path']}
    else:
        emp = _get("SELECT id, name, photo_path FROM employees WHERE barcode=? AND role=? AND active=1", (raw, rl))
        weight_id = ctx.get('weight_id') if rl == 'EMBALADOR' else None

    # Override por CV
    base_weight_name = None
    if cv_box_model and cv_box_model != 'NÃO IDENTIF.':
        base_weight_name = cv_box_model
        bw = _get("SELECT id FROM box_weights WHERE (name=? OR name LIKE ?) AND active=1 LIMIT 1",
                  (base_weight_name, f'%{base_weight_name}%'))
        if bw:
            weight_id = bw['id']
    elif weight_id:
        bw = _get("SELECT name FROM box_weights WHERE id=?", (weight_id,))
        if bw:
            base_weight_name = bw['name']

    # Calibre-specific weight lookup
    if base_weight_name and caliber:
        import re
        m = re.search(r'\d+', str(caliber))
        if m:
            cal_num = m.group(0)
            candidates = [
                f'{base_weight_name} - Calibre {cal_num}',
                f'{base_weight_name} - Cal. {cal_num}',
                f'{base_weight_name} - {cal_num}',
                f'{base_weight_name} Calibre {cal_num}',
                f'{base_weight_name} Cal. {cal_num}',
                f'{base_weight_name} {cal_num}',
            ]
            placeholders = ','.join(['?'] * len(candidates))
            specific = _get(f"SELECT id FROM box_weights WHERE name IN ({placeholders}) AND active=1", candidates)
            if specific:
                weight_id = specific['id']

    if not emp:
        return {'ok': False, 'error': 'Código não pertence à função ativa ou colaborador não encontrado.'}

    # Caixa sem identificação (sem câmera / IA offline / sem contagem): a contagem
    # NÃO é interrompida. Ela entra no estoque como calibre 'N/I' e, se a câmera
    # falhou e o código de barras não define o tipo de caixa, sem peso
    # ("NÃO IDENTIFICADA"). O mapeamento é feito depois no sistema web.
    unidentified = False
    if rl == 'EMBALADOR' and not caliber:
        caliber = 'N/I'
        unidentified = True
        if cv_unidentified and not mapping:
            weight_id = None

    _run("""
        INSERT INTO scan_events(ts,station_id,scanner_id,role,employee_id,raw_barcode,weight_id,parcel_id,fruit_id,variety_id,caliber)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)
    """, (ts, st, sc, rl, emp['id'], raw, weight_id,
          ctx.get('parcel_id'), ctx.get('fruit_id'), ctx.get('variety_id'), caliber))

    hs = hour_start_ms(ts)
    conn = get_db()
    conn.execute("""
        INSERT INTO hourly_stats(hour_start,station_id,role,employee_id,produced_count,quality_deducted)
        VALUES(?,?,?,?,0,0)
        ON CONFLICT(hour_start,station_id,role,employee_id) DO NOTHING
    """, (hs, st, rl, emp['id']))
    conn.execute("""
        UPDATE hourly_stats SET produced_count=produced_count+1
        WHERE hour_start=? AND station_id=? AND role=? AND employee_id=?
    """, (hs, st, rl, emp['id']))
    conn.commit()

    return {'ok': True, 'counted': True, 'employee': emp, 'context': ctx, 'usedWeightId': weight_id, 'unidentified': unidentified}


# ─── stateGet (Ranking) ────────────────────────────────────────────────────────
def state_get(station_id='ST01', role='EMBALADOR') -> dict:
    cfg = config_get_all()
    st, rl = norm_station(station_id), norm_role(role)
    ts = now_ms()
    ds = day_start_ms(ts)
    de = ds + 86_399_999
    target_key = 'target_per_hour_stacker' if rl == 'EMPILHADOR' else 'target_per_hour_packer'
    hourly_target = int(sanitize_num(cfg.get(target_key), 100))

    rows = _all("""
        SELECT e.id, e.name, e.photo_path,
               SUM(hs.produced_count) as produced_count,
               SUM(hs.quality_deducted) + COALESCE((
                 SELECT SUM(penalty_boxes) FROM quality_audits
                 WHERE employee_id=e.id AND ts BETWEEN ? AND ?
               ),0) as quality_deducted,
               COUNT(hs.hour_start) as hours_active
        FROM hourly_stats hs
        JOIN employees e ON e.id=hs.employee_id
        WHERE hs.hour_start>=? AND hs.station_id=? AND hs.role=?
        GROUP BY e.id, e.name, e.photo_path
        ORDER BY (SUM(hs.produced_count) - COALESCE((
          SELECT SUM(penalty_boxes) FROM quality_audits
          WHERE employee_id=e.id AND ts BETWEEN ? AND ?
        ),0)) DESC, e.name ASC
    """, (ds, de, ds, st, rl, ds, de))

    top10 = []
    for r in rows[:10]:
        produced = int(r.get('produced_count') or 0)
        deducted = int(r.get('quality_deducted') or 0)
        hours_active = max(1, int(r.get('hours_active') or 1))
        target_for_emp = hourly_target * hours_active
        net_produced = max(0, produced - deducted)
        quality_pct = round((net_produced / produced * 100) * 10) / 10 if produced > 0 else 100
        productivity_pct = round((net_produced / target_for_emp * 100) * 10) / 10 if target_for_emp > 0 else 0

        top10.append({
            'id': r['id'],
            'name': r['name'],
            'photoPath': r.get('photo_path') or '',
            'produced': net_produced,
            'qualityPct': quality_pct,
            'productivityPct': productivity_pct,
            'fraudPenalty': 0
        })

    return {'role': rl, 'leader': top10[0] if top10 else None, 'top10': top10, 'targetPerHour': hourly_target}


# ─── totalsNow ────────────────────────────────────────────────────────────────
def totals_now(station_id='ST01', role='EMBALADOR') -> dict:
    st, rl = norm_station(station_id), norm_role(role)
    ts = now_ms()
    ds, hs = day_start_ms(ts), hour_start_ms(ts)
    cfg = config_get_all()
    is_melon = cfg.get('culture_type') == 'MELAO_MELANCIA'

    day_row = _get("""
        SELECT COUNT(*) as n, SUM(COALESCE(bw.weight_kg,0)) as kg
        FROM scan_events se LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.role=? AND se.employee_id IS NOT NULL AND se.ts>=?
    """, (st, rl, ds))

    hour_row = _get("""
        SELECT COUNT(*) as n FROM scan_events
        WHERE station_id=? AND role=? AND employee_id IS NOT NULL AND ts>=?
    """, (st, rl, hs))

    penalties = _get("SELECT SUM(penalty_boxes) as n FROM quality_audits WHERE ts>=?", (ds,))
    penalty_count = int((penalties or {}).get('n') or 0)

    by_weight = _all("""
        SELECT COALESCE(bw.name,'SEM PESO') as label, COUNT(*) as boxes, SUM(COALESCE(bw.weight_kg,0)) as kg
        FROM scan_events se LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.role=? AND se.employee_id IS NOT NULL AND se.ts>=?
        GROUP BY COALESCE(bw.name,'SEM PESO') ORDER BY boxes DESC
    """, (st, rl, ds))

    by_parcel = []
    if is_melon:
        by_parcel = _all("""
            SELECT (COALESCE(p.code,'S/P')||' - '||COALESCE(f.name,'S/F')||' ('||COALESCE(v.name,'S/V')||')') as label,
                   COUNT(*) as boxes, SUM(COALESCE(bw.weight_kg,0)) as kg
            FROM scan_events se
            LEFT JOIN box_weights bw ON bw.id=se.weight_id
            LEFT JOIN parcels p ON p.id=se.parcel_id
            LEFT JOIN fruits f ON f.id=se.fruit_id
            LEFT JOIN varieties v ON v.id=se.variety_id
            WHERE se.station_id=? AND se.role=? AND se.employee_id IS NOT NULL AND se.ts>=?
            GROUP BY se.parcel_id, se.fruit_id, se.variety_id ORDER BY boxes DESC
        """, (st, rl, ds))

    return {
        'stationId': st, 'role': rl,
        'dayTotal': max(0, int((day_row or {}).get('n') or 0) - penalty_count),
        'dayKg': round(float((day_row or {}).get('kg') or 0) * 10) / 10,
        'hourTotal': int((hour_row or {}).get('n') or 0),
        'byWeight': by_weight,
        'byParcel': by_parcel,
    }


# ─── logsList ────────────────────────────────────────────────────────────────
def logs_list(start_ms=None, end_ms=None, station_id='ST01', role=None, limit=500) -> list:
    st = norm_station(station_id)
    where, args = ['se.station_id=?'], [st]
    if start_ms:
        where.append('se.ts>=?'); args.append(int(start_ms))
    if end_ms:
        where.append('se.ts<=?'); args.append(int(end_ms))
    if role:
        where.append('se.role=?'); args.append(norm_role(role))
    lim = min(50000, max(1, int(limit or 500)))
    return _all(f"""
        SELECT se.id, se.ts, se.role, se.raw_barcode as rawBarcode,
               e.name as employeeName, e.barcode as employeeBarcode, e.photo_path as photoPath,
               bw.name as weightLabel, p.code as parcelCode, f.name as fruitName, v.name as varietyName
        FROM scan_events se
        LEFT JOIN employees e ON e.id=se.employee_id
        LEFT JOIN box_weights bw ON bw.id=se.weight_id
        LEFT JOIN parcels p ON p.id=se.parcel_id
        LEFT JOIN fruits f ON f.id=se.fruit_id
        LEFT JOIN varieties v ON v.id=se.variety_id
        WHERE {' AND '.join(where)} ORDER BY se.ts DESC LIMIT {lim}
    """, args)


# ─── financePreview ──────────────────────────────────────────────────────────
def finance_preview(start_ms, end_ms, role='EMBALADOR') -> dict:
    rl = norm_role(role)
    cfg = config_get_all()
    key = 'target_per_hour_stacker' if rl == 'EMPILHADOR' else 'target_per_hour_packer'
    vkey = 'value_per_box_stacker' if rl == 'EMPILHADOR' else 'value_per_box_packer'
    target = sanitize_num(cfg.get(key), 100)
    value_per_box = sanitize_num(cfg.get(vkey), 0)
    bonus_pct = sanitize_num(cfg.get('bonus_pct'), 0)

    items = _all("""
        SELECT e.id as employeeId, e.name, e.photo_path as photoPath, COUNT(se.id) as boxes
        FROM scan_events se JOIN employees e ON e.id=se.employee_id
        WHERE se.ts BETWEEN ? AND ? AND se.role=? AND se.employee_id IS NOT NULL
        GROUP BY e.id, e.name, e.photo_path ORDER BY boxes DESC, e.name ASC
    """, (int(start_ms), int(end_ms), rl))

    result = []
    for r in items:
        boxes = int(r.get('boxes') or 0)
        gross = boxes * value_per_box
        bonus = gross * (bonus_pct / 100)
        result.append({
            'employeeId': r['employeeId'], 'name': r['name'],
            'photoPath': r.get('photoPath') or '',
            'boxes': boxes,
            'avgProd': round((boxes / target * 100) * 10) / 10 if target else 0,
            'avgQual': 100,
            'grossValue': round(gross * 100) / 100,
            'bonusValue': round(bonus * 100) / 100,
            'totalValue': round((gross + bonus) * 100) / 100,
        })
    return {'ok': True, 'targetPerHour': target, 'valuePerBox': value_per_box, 'bonusPct': bonus_pct, 'items': result}


# ─── dailyFinalize ────────────────────────────────────────────────────────────
def daily_finalize(station_id='ST01', date=None, force_sync_fn=None) -> dict:
    st = norm_station(station_id)
    date = date or iso_date_today()
    s_ms, e_ms = start_of_day_ms(date), end_of_day_ms(date)
    cfg = config_get_all()
    v_packer = sanitize_num(cfg.get('value_per_box_packer'), 0)
    v_stacker = sanitize_num(cfg.get('value_per_box_stacker'), 0)
    b_pct = sanitize_num(cfg.get('bonus_pct'), 0)

    aggregates = _all("""
        SELECT e.id as employee_id, e.name as employee_name, se.role,
               COUNT(se.id) as total_boxes, SUM(COALESCE(bw.weight_kg,0)) as total_kg
        FROM scan_events se JOIN employees e ON se.employee_id=e.id
        LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.ts BETWEEN ? AND ?
        GROUP BY e.id, e.name, se.role
    """, (st, s_ms, e_ms))

    if not aggregates:
        return {'ok': False, 'message': 'Nenhuma produção encontrada para este dia.'}

    created_at = now_ms()
    for row in aggregates:
        v_per_box = v_stacker if row['role'] == 'EMPILHADOR' else v_packer
        boxes = int(row['total_boxes'] or 0)
        kg = float(row['total_kg'] or 0)
        gross = boxes * v_per_box
        total_value = round((gross + gross * b_pct / 100) * 100) / 100
        _run("""
            INSERT INTO daily_production_summary(date,station_id,employee_id,employee_name,role,total_boxes,total_kg,total_value,created_at,synced)
            VALUES(?,?,?,?,?,?,?,?,?,0)
            ON CONFLICT(date,station_id,employee_id,role) DO UPDATE SET
              total_boxes=excluded.total_boxes, total_kg=excluded.total_kg,
              total_value=excluded.total_value, created_at=excluded.created_at, synced=0
        """, (date, st, row['employee_id'], row['employee_name'], row['role'], boxes, kg, total_value, created_at))

    # Força sync antes de disparar o relatório
    if force_sync_fn:
        try:
            force_sync_fn()
        except Exception as e:
            print(f'Finalize: Erro no sync pré-relatório: {e}')

    # Chama Edge Function de relatório WhatsApp
    wa_sent = 0
    try:
        wa_res = requests.post(
            f'{cfg.get("supabase_url","")}/functions/v1/send-daily-report',
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {cfg.get("auth_token","")}'},
            json={'tenant_id': cfg.get('tenant_id'), 'date': date},
            timeout=15
        )
        wa_json = wa_res.json()
        wa_sent = wa_json.get('sent', 0)
    except Exception as e:
        print(f'Finalize: Erro ao chamar edge function: {e}')

    return {'ok': True, 'count': len(aggregates), 'waSent': wa_sent}


# ─── dashboardGetStats ────────────────────────────────────────────────────────
def dashboard_get_stats(station_id='ST01', start_ms=0, end_ms=0, employee_id=None) -> dict:
    st = norm_station(station_id)
    s, e = int(start_ms), int(end_ms)
    cfg = config_get_all()
    is_melon = cfg.get('culture_type') == 'MELAO_MELANCIA'
    t_packer = int(sanitize_num(cfg.get('target_per_hour_packer'), 100))
    t_stacker = int(sanitize_num(cfg.get('target_per_hour_stacker'), 100))

    emp_where = 'AND se.employee_id=?' if employee_id else ''
    emp_param = [employee_id] if employee_id else []

    collab = _all(f"""
        SELECT e.id, e.name, e.photo_path as photoPath, e.role,
               MAX(0, COUNT(se.id) - COALESCE((SELECT SUM(penalty_boxes) FROM quality_audits WHERE employee_id=e.id AND ts BETWEEN ? AND ?),0)) as boxes,
               SUM(COALESCE(bw.weight_kg,0)) as kg,
               COALESCE((SELECT SUM(penalty_boxes) FROM quality_audits WHERE employee_id=e.id AND ts BETWEEN ? AND ?),0) as penalty_boxes
        FROM employees e JOIN scan_events se ON se.employee_id=e.id
        LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.ts BETWEEN ? AND ? {emp_where}
        GROUP BY e.id, e.name, e.photo_path, e.role
        ORDER BY (COUNT(se.id) - COALESCE((SELECT SUM(penalty_boxes) FROM quality_audits WHERE employee_id=e.id AND ts BETWEEN ? AND ?),0)) DESC
        LIMIT 10
    """, [s, e, s, e, st, s, e] + emp_param + [s, e])

    box_stats = _all(f"""
        SELECT COALESCE(bw.name,'SEM PESO') as label, COUNT(se.id) as boxes, SUM(COALESCE(bw.weight_kg,0)) as kg
        FROM scan_events se LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.employee_id IS NOT NULL AND se.ts BETWEEN ? AND ? {emp_where}
        GROUP BY COALESCE(bw.name,'SEM PESO') ORDER BY boxes DESC
    """, [st, s, e] + emp_param)

    parcel_stats = _all(f"""
        SELECT (COALESCE(p.code,'S/P')||' - '||COALESCE(f.name,'S/F')||' ('||COALESCE(v.name,'S/V')||')') as label,
               COUNT(se.id) as boxes, SUM(COALESCE(bw.weight_kg,0)) as kg
        FROM scan_events se
        LEFT JOIN box_weights bw ON bw.id=se.weight_id
        LEFT JOIN parcels p ON p.id=se.parcel_id
        LEFT JOIN fruits f ON f.id=se.fruit_id
        LEFT JOIN varieties v ON v.id=se.variety_id
        WHERE se.station_id=? AND se.employee_id IS NOT NULL AND se.ts BETWEEN ? AND ? {emp_where}
        GROUP BY se.parcel_id, se.fruit_id, se.variety_id ORDER BY boxes DESC
    """, [st, s, e] + emp_param)

    total_stats = _get(f"""
        SELECT COUNT(se.id) as totalBoxes, SUM(COALESCE(bw.weight_kg,0)) as totalKg
        FROM scan_events se LEFT JOIN box_weights bw ON bw.id=se.weight_id
        WHERE se.station_id=? AND se.ts BETWEEN ? AND ? {emp_where}
    """, [st, s, e] + emp_param)

    penalties = _get(f"SELECT SUM(penalty_boxes) as n FROM quality_audits WHERE ts BETWEEN ? AND ? {emp_where}", [s, e] + emp_param)
    penalty_count = int((penalties or {}).get('n') or 0)

    hourly_collab = _all(f"""
        SELECT e.name, strftime('%H', se.ts/1000, 'unixepoch','localtime') as hr, COUNT(se.id) as boxes
        FROM scan_events se JOIN employees e ON se.employee_id=e.id
        WHERE se.station_id=? AND se.ts BETWEEN ? AND ? {emp_where}
        GROUP BY e.name, hr ORDER BY hr ASC, boxes DESC
    """, [st, s, e] + emp_param)

    current = _get(f"SELECT COUNT(*) as n FROM scan_events se WHERE se.station_id=? AND se.employee_id IS NOT NULL AND se.ts BETWEEN ? AND ? {emp_where}", [st, s, e] + emp_param)
    duration = e - s
    prev = _get(f"SELECT COUNT(*) as n FROM scan_events se WHERE se.station_id=? AND se.employee_id IS NOT NULL AND se.ts BETWEEN ? AND ? {emp_where}", [st, s - duration, s] + emp_param)

    net_boxes = max(0, int((total_stats or {}).get('totalBoxes') or 0) - penalty_count)
    hours_active = max(1, round((e - s) / 3_600_000))
    avg_per_hour = round(net_boxes / hours_active)

    quality_breakdown = _all(f"""
        SELECT COALESCE(issue_type,'Outros') as label, SUM(penalty_boxes) as count
        FROM quality_audits WHERE ts BETWEEN ? AND ? {emp_where}
        GROUP BY COALESCE(issue_type,'Outros') ORDER BY count DESC
    """, [s, e] + emp_param)

    quality_worst = _all(f"""
        SELECT e.name, SUM(q.penalty_boxes) as penalty_count
        FROM quality_audits q JOIN employees e ON e.id=q.employee_id
        WHERE q.ts BETWEEN ? AND ? {emp_where}
        GROUP BY e.name ORDER BY penalty_count DESC LIMIT 5
    """, [s, e] + emp_param)

    def enrich_collab(c):
        target = t_stacker if c.get('role') == 'EMPILHADOR' else t_packer
        raw = int(c.get('boxes') or 0)
        pen = int(c.get('penalty_boxes') or 0)
        net = max(0, raw - pen)
        return {**c, 'boxes': net, 'rawBoxes': raw, 'target': target,
                'yieldPct': round(net / target * 100) if target else 0}

    return {
        'collaboratorStats': [enrich_collab(c) for c in collab],
        'boxTypeStats': box_stats,
        'parcelStats': parcel_stats,
        'hourlyCollab': hourly_collab,
        'totalBoxes': net_boxes,
        'totalKg': round(float((total_stats or {}).get('totalKg') or 0) * 10) / 10,
        'penaltyCount': penalty_count,
        'avgPerHour': avg_per_hour,
        'qualityBreakdown': quality_breakdown,
        'qualityWorstPerformers': quality_worst,
        'avgScanGapSec': 0,
        'targets': {'packer': t_packer, 'stacker': t_stacker},
        'comparison': {'current': int((current or {}).get('n') or 0), 'previous': int((prev or {}).get('n') or 0)},
        'packerTotal': sum(int(c.get('boxes') or 0) for c in collab if c.get('role') == 'EMBALADOR'),
        'stackerTotal': sum(int(c.get('boxes') or 0) for c in collab if c.get('role') == 'EMPILHADOR'),
        'isMelonMode': is_melon,
    }
