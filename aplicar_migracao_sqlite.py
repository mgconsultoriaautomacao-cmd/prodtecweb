"""
aplicar_migracao_sqlite.py — Executa a migração no SQLite local do PRODTEC Packinghouse
Localiza automaticamente o banco de dados (seja em modo dev ou %APPDATA%),
aplica as alterações com segurança, ativa WAL e cria índices.
"""
import sys
import sqlite3
from pathlib import Path

# Adiciona o caminho do python_app
sys.path.insert(0, str(Path(__file__).parent / 'packinghouse-app' / 'python_app'))

try:
    from db_python import get_db_path
    db_path = get_db_path()
except Exception:
    db_path = Path(__file__).parent / 'packinghouse-app' / 'data' / 'packing.sqlite3'

print(f"=== APLICANDO MIGRAÇÃO LOCAL NO SQLITE ===")
print(f"Banco de dados alvo: {db_path}")

sql_file = Path(__file__).parent / 'MIGRACAO_LOCAL_SQLITE.sql'
if not sql_file.exists():
    print(f"ERRO: Arquivo {sql_file} não encontrado.")
    sys.exit(1)

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_script = f.read()

conn = sqlite3.connect(str(db_path), timeout=10.0)
conn.row_factory = sqlite3.Row

try:
    conn.executescript(sql_script)
    conn.commit()
    print("Sucesso! Migração local aplicada com êxito.")
    
    # Validação rápida de integridade
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode")
    j_mode = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(1) FROM config WHERE key='enable_batch_sync'")
    has_flag = cursor.fetchone()[0]
    
    print(f"-> Journal Mode: {j_mode.upper()}")
    print(f"-> Feature Flag 'enable_batch_sync': {'ATIVA' if has_flag else 'AUSENTE'}")
    
except Exception as e:
    print(f"Erro ao aplicar migração SQLite: {e}")
    sys.exit(1)
finally:
    conn.close()
