-- ============================================================
-- MIGRAÇÃO CORRETIVA: CAMPOS FALTANTES (CAMPO E DASHBOARD)
-- ============================================================

-- 1. CORREÇÃO NA TABELA DE SESSÕES DE COLHEITA (field_carrao_sessions)
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS tractor_driver    TEXT,
  ADD COLUMN IF NOT EXISTS carrao_seq        INTEGER,
  ADD COLUMN IF NOT EXISTS synced            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corte             INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ph_signature_base64 TEXT;

-- 2. CORREÇÃO NA TABELA DE EXPEDIÇÕES (expeditions)
ALTER TABLE expeditions 
  ADD COLUMN IF NOT EXISTS caliber           TEXT,
  ADD COLUMN IF NOT EXISTS variety           TEXT,
  ADD COLUMN IF NOT EXISTS box_type          TEXT;

-- 3. CORREÇÃO NA TABELA DE VENDAS A GRANEL (bulk_sales)
ALTER TABLE bulk_sales 
  ADD COLUMN IF NOT EXISTS customer_name     TEXT,
  ADD COLUMN IF NOT EXISTS invoice_num       TEXT,
  ADD COLUMN IF NOT EXISTS fruit_type        TEXT,
  ADD COLUMN IF NOT EXISTS is_waste          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_received       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_base64  TEXT,
  ADD COLUMN IF NOT EXISTS ts                TIMESTAMPTZ DEFAULT NOW();

-- 4. TABELA DE FALTAS E ASSIDUIDADE (employee_absences)
CREATE TABLE IF NOT EXISTS employee_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  employee_barcode TEXT NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_barcode, date)
);

COMMENT ON TABLE employee_absences IS 'Registro de faltas para cálculo de assiduidade e descontos em folha';
