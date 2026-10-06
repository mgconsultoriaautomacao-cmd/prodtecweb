"""
db_python.py — Camada de banco de dados SQLite para o PRODTEC Packinghouse
Equivalente direto ao src/db.js do Electron — mesmo schema, mesma lógica de migração.
"""
import sqlite3
import os
import shutil
import time
from pathlib import Path

_db_connection = None

PROD_URL    = 'https://yiigaohjvvieeooxsban.supabase.co'
PROD_KEY    = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
               'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hz'
               'YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6'
               'MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8')
PROD_TENANT = 'b7ad82dd-dca3-46af-91c6-5d564b7c3cc5'


def get_db_path() -> Path:
    """
    Determina o caminho do banco SQLite.
    Em modo desenvolvimento: packinghouse-app/data/packing.sqlite3
    Em modo produção (PyInstaller): %APPDATA%/PRODTEC Packinghouse/data/packing.sqlite3
    """
    # Verifica se está rodando como executável PyInstaller
    if getattr(__import__('sys'), 'frozen', False):
        import sys
        app_data = Path(os.environ.get('APPDATA', Path.home())) / 'PRODTEC Packinghouse' / 'data'
        db_path = app_data / 'packing.sqlite3'

        # Tenta migrar o banco antigo se não existir o novo
        if not db_path.exists():
            old_path = Path(sys.executable).parent / 'data' / 'packing.sqlite3'
            if old_path.exists():
                app_data.mkdir(parents=True, exist_ok=True)
                shutil.copy2(old_path, db_path)
                print(f'DB: Banco migrado de {old_path} para {db_path}')

        app_data.mkdir(parents=True, exist_ok=True)
        return db_path
    else:
        # Modo desenvolvimento: mesma pasta data/ do Electron
        dev_dir = Path(__file__).parent.parent / 'data'
        dev_dir.mkdir(parents=True, exist_ok=True)
        return dev_dir / 'packing.sqlite3'


def get_db() -> sqlite3.Connection:
    """Retorna a conexão global do banco (singleton)."""
    global _db_connection
    if _db_connection is None:
        _db_connection = init_db()
    return _db_connection


def init_db() -> sqlite3.Connection:
    """Inicializa o banco SQLite com o schema completo — equivalente ao initDb() do db.js."""
    global _db_connection
    if _db_connection:
        return _db_connection

    db_path = get_db_path()
    print(f'DB: Abrindo banco em {db_path}')

    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row   # Permite acesso por nome de coluna
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA foreign_keys = ON')

    _create_schema(conn)
    _run_migrations(conn)
    _ensure_prod_config(conn)

    conn.commit()
    _db_connection = conn
    print('DB: Inicializado com sucesso.')
    return conn


def _create_schema(conn: sqlite3.Connection):
    """Cria todas as tabelas se não existirem."""
    ddl_statements = [
        """
        CREATE TABLE IF NOT EXISTS config (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS employees (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode    TEXT NOT NULL,
            name       TEXT NOT NULL,
            role       TEXT NOT NULL,
            sector     TEXT,
            photo_path TEXT,
            active     INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_id  TEXT UNIQUE,
            synced     INTEGER NOT NULL DEFAULT 0,
            UNIQUE(barcode, role)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS fruits (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            active     INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_id  TEXT UNIQUE,
            synced     INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS varieties (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            active     INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_id  TEXT UNIQUE,
            synced     INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS parcels (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            code       TEXT NOT NULL UNIQUE,
            active     INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_id  TEXT UNIQUE,
            synced     INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS box_weights (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            weight_kg  REAL,
            active     INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_id  TEXT,
            synced     INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS parcel_fruit_varieties (
            parcel_id  INTEGER NOT NULL,
            fruit_id   INTEGER NOT NULL,
            variety_id INTEGER NOT NULL,
            PRIMARY KEY (parcel_id, fruit_id, variety_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS station_context (
            station_id TEXT    NOT NULL,
            role       TEXT    NOT NULL,
            parcel_id  INTEGER,
            fruit_id   INTEGER,
            variety_id INTEGER,
            weight_id  INTEGER,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (station_id, role)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS daily_production_summary (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            date          TEXT    NOT NULL,
            station_id    TEXT    NOT NULL,
            employee_id   INTEGER NOT NULL,
            employee_name TEXT    NOT NULL,
            role          TEXT    NOT NULL,
            total_boxes   INTEGER NOT NULL,
            total_kg      REAL    NOT NULL,
            total_value   REAL    NOT NULL,
            created_at    INTEGER NOT NULL,
            synced        INTEGER NOT NULL DEFAULT 0,
            UNIQUE(date, station_id, employee_id, role)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS scan_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          INTEGER NOT NULL,
            station_id  TEXT    NOT NULL,
            scanner_id  TEXT    NOT NULL,
            role        TEXT    NOT NULL,
            employee_id INTEGER,
            raw_barcode TEXT    NOT NULL,
            parcel_id   INTEGER,
            fruit_id    INTEGER,
            variety_id  INTEGER,
            weight_id   INTEGER,
            caliber     TEXT,
            synced      INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS hourly_stats (
            hour_start       INTEGER NOT NULL,
            station_id       TEXT    NOT NULL,
            role             TEXT    NOT NULL,
            employee_id      INTEGER NOT NULL,
            produced_count   INTEGER NOT NULL DEFAULT 0,
            quality_deducted INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (hour_start, station_id, role, employee_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS barcode_mappings (
            barcode     TEXT    PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            weight_id   INTEGER NOT NULL,
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL,
            synced      INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS quality_audits (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            ts            INTEGER NOT NULL,
            station_id    TEXT    NOT NULL,
            employee_id   INTEGER NOT NULL,
            parcel_id     INTEGER,
            penalty_boxes INTEGER NOT NULL DEFAULT 0,
            issue_type    TEXT,
            reason        TEXT,
            remote_id     TEXT UNIQUE,
            synced        INTEGER NOT NULL DEFAULT 0
        )
        """,
    ]

    for ddl in ddl_statements:
        try:
            conn.execute(ddl)
        except sqlite3.Error as e:
            print(f'DB Schema Warning: {e}')


def _run_migrations(conn: sqlite3.Connection):
    """Adiciona colunas que podem não existir em bancos mais antigos (equivalente ao tablesToMigrate do db.js)."""
    migrations = [
        ('employees',             'remote_id', 'TEXT'),
        ('employees',             'sector',    'TEXT'),
        ('employees',             'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('fruits',                'remote_id', 'TEXT'),
        ('fruits',                'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('varieties',             'remote_id', 'TEXT'),
        ('varieties',             'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('parcels',               'remote_id', 'TEXT'),
        ('parcels',               'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('box_weights',           'remote_id', 'TEXT'),
        ('box_weights',           'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('quality_audits',        'remote_id', 'TEXT'),
        ('scan_events',           'weight_id', 'INTEGER'),
        ('scan_events',           'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('scan_events',           'caliber',   'TEXT'),
        ('barcode_mappings',      'synced',    'INTEGER NOT NULL DEFAULT 0'),
        ('daily_production_summary', 'synced', 'INTEGER NOT NULL DEFAULT 0'),
    ]
    for table, column, col_type in migrations:
        try:
            conn.execute(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}')
        except sqlite3.OperationalError:
            pass  # Coluna já existe — ignorar

    # Índices de performance e unicidade
    indexes = [
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_audits_remote_id ON quality_audits(remote_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_remote_id     ON employees(remote_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_barcode_role  ON employees(barcode, role)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_parcels_remote_id       ON parcels(remote_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_fruits_remote_id        ON fruits(remote_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_varieties_remote_id     ON varieties(remote_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_box_weights_remote_id   ON box_weights(remote_id)',
        'CREATE INDEX IF NOT EXISTS idx_scan_events_ts          ON scan_events(ts)',
        'CREATE INDEX IF NOT EXISTS idx_scan_events_employee_id ON scan_events(employee_id)',
        'CREATE INDEX IF NOT EXISTS idx_scan_events_station_id  ON scan_events(station_id)',
        'CREATE INDEX IF NOT EXISTS idx_scan_events_synced      ON scan_events(synced)',
        'CREATE INDEX IF NOT EXISTS idx_quality_audits_synced   ON quality_audits(synced)',
        'CREATE INDEX IF NOT EXISTS idx_hourly_stats_station    ON hourly_stats(station_id, role, hour_start)',
    ]
    for idx in indexes:
        try:
            conn.execute(idx)
        except sqlite3.Error as e:
            print(f'DB Index Warning: {e}')


def _ensure_prod_config(conn: sqlite3.Connection):
    """Garante que o banco aponte para o ambiente de produção correto."""
    row = conn.execute("SELECT value FROM config WHERE key='supabase_url'").fetchone()
    if not row or row['value'] != PROD_URL:
        print('DB: URL divergente. Atualizando para produção...')
        conn.execute(
            "INSERT INTO config(key,value) VALUES('supabase_url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (PROD_URL,)
        )
        conn.execute(
            "INSERT INTO config(key,value) VALUES('supabase_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (PROD_KEY,)
        )


def row_to_dict(row) -> dict:
    """Converte sqlite3.Row para dict serializável."""
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows) -> list:
    """Converte lista de sqlite3.Row para lista de dicts."""
    return [dict(r) for r in rows]


def now_ms() -> int:
    """Timestamp atual em milissegundos (equivalente ao Date.now() do JS)."""
    return int(time.time() * 1000)
