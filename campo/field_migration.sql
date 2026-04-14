-- ================================================================
-- MIGRAÇÃO: PWA de Campo — Qualidade + Carrões de Colheita
-- Execute no Supabase SQL Editor (uma vez)
-- ================================================================

-- 1. EXPANDIR quality_audits com campos de compliance
-- ----------------------------------------------------------------
ALTER TABLE quality_audits
  ADD COLUMN IF NOT EXISTS inspector_name   TEXT,
  ADD COLUMN IF NOT EXISTS signature_base64 TEXT,
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,    -- infra pronta, opcional
  ADD COLUMN IF NOT EXISTS parcel_id        BIGINT;

-- 2. SUPORTE A FUNCIONÁRIOS COLHEDORES
-- ----------------------------------------------------------------
-- Adicionar colhedores via web dashboard com role = 'COLHEDOR'
-- A coluna role já existe na tabela employees

-- 3. CRIAR TABELA field_carrao_sessions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_carrao_sessions (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID         NOT NULL,
  ts                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  date                DATE         NOT NULL,
  shift               TEXT         NOT NULL CHECK (shift IN ('MANHA', 'TARDE')),
  fruit_type          TEXT         NOT NULL CHECK (fruit_type IN ('MELANCIA', 'MELAO')),
  parcel_id           BIGINT,
  qty_carrocoes       INTEGER      NOT NULL CHECK (qty_carrocoes > 0),
  price_per_carrao    DECIMAL(10,2) NOT NULL,
  total_value         DECIMAL(10,2) NOT NULL,
  value_per_employee  DECIMAL(10,2) NOT NULL,
  employee_count      INTEGER      NOT NULL DEFAULT 1,
  registered_by       TEXT         NOT NULL,
  notes               TEXT,
  synced              BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcs_tenant_date  ON field_carrao_sessions(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_tenant_shift ON field_carrao_sessions(tenant_id, date, shift);

-- 4. CRIAR TABELA field_carrao_employees (many-to-many)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_carrao_employees (
  session_id     UUID          NOT NULL REFERENCES field_carrao_sessions(id) ON DELETE CASCADE,
  employee_id    BIGINT        NOT NULL,
  employee_name  TEXT          NOT NULL,
  value_received DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (session_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_fce_session ON field_carrao_employees(session_id);

-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE field_carrao_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_carrao_employees ENABLE ROW LEVEL SECURITY;

-- Sessões: isolamento por tenant
-- (DROP antes para ser idempotente — pode rodar novamente sem erro)
DROP POLICY IF EXISTS "fcs_tenant_all" ON field_carrao_sessions;
CREATE POLICY "fcs_tenant_all" ON field_carrao_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Funcionários: acesso via sessão do mesmo tenant
DROP POLICY IF EXISTS "fce_tenant_all" ON field_carrao_employees;
CREATE POLICY "fce_tenant_all" ON field_carrao_employees
  FOR ALL USING (
    session_id IN (
      SELECT id FROM field_carrao_sessions
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

-- ================================================================
-- INSTRUÇÃO FINAL
-- Após executar, adicione no web dashboard (Funcionários)
-- os colhedores de campo com Função = "COLHEDOR"
-- ================================================================
