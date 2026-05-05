-- ============================================================
-- MIGRAÇÃO CORRETIVA: CAMPOS FALTANTES (CAMPO E DASHBOARD)
-- ============================================================

-- 1. CORREÇÃO NA TABELA DE SESSÕES DE COLHEITA (field_carrao_sessions)
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS tractor_driver    TEXT,
  ADD COLUMN IF NOT EXISTS carrao_seq        INTEGER,
  ADD COLUMN IF NOT EXISTS synced            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ph_signature_base64 TEXT;

-- 2. CORREÇÃO NA TABELA DE VENDAS A GRANEL (bulk_sales)
ALTER TABLE bulk_sales 
  ADD COLUMN IF NOT EXISTS customer_name     TEXT,
  ADD COLUMN IF NOT EXISTS invoice_num       TEXT,
  ADD COLUMN IF NOT EXISTS is_waste          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_received       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_base64  TEXT,
  ADD COLUMN IF NOT EXISTS ts                TIMESTAMPTZ DEFAULT NOW();

-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN field_carrao_sessions.carrao_seq IS 'Número sequencial do carrocão para rastreabilidade';
COMMENT ON COLUMN field_carrao_sessions.tractor_driver IS 'Nome do tratorista responsável pelo transporte';
