-- ============================================================
-- MIGRAÇÃO V2: Customização Total + Rastreio de Produção
-- ============================================================
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ═══════════════════════════════════════
-- 1. METAS POR FUNÇÃO (roles)
-- ═══════════════════════════════════════
ALTER TABLE roles 
  ADD COLUMN IF NOT EXISTS target_per_hour DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS value_per_unit DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '👤';

COMMENT ON COLUMN roles.target_per_hour IS 'Meta de produção por hora para esta função (ex: 50 cx/h)';
COMMENT ON COLUMN roles.value_per_unit IS 'Valor pago por unidade produzida (R$/cx ou R$/carrocão)';
COMMENT ON COLUMN roles.icon IS 'Emoji representativo da função';

-- ═══════════════════════════════════════
-- 2. TABELA DE MÁQUINAS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS machines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT,
  type        TEXT DEFAULT 'COLHEITADEIRA', -- COLHEITADEIRA, TRATOR, PULVERIZADOR, OUTRO
  status      TEXT DEFAULT 'ATIVO',         -- ATIVO, MANUTENCAO, INATIVO
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_machines_all" ON machines;
CREATE POLICY "tenant_machines_all" ON machines
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_machines_tenant ON machines(tenant_id);

-- ═══════════════════════════════════════
-- 3. CARGA HORÁRIA CUSTOMIZÁVEL NO TENANT
-- ═══════════════════════════════════════
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS work_start_time TEXT DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS work_end_time TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS lunch_start_time TEXT DEFAULT '11:30',
  ADD COLUMN IF NOT EXISTS lunch_end_time TEXT DEFAULT '13:00';

COMMENT ON COLUMN tenants.work_start_time IS 'Hora de início do expediente (HH:MM)';
COMMENT ON COLUMN tenants.work_end_time IS 'Hora de fim do expediente (HH:MM)';
COMMENT ON COLUMN tenants.lunch_start_time IS 'Hora de início do almoço (HH:MM)';
COMMENT ON COLUMN tenants.lunch_end_time IS 'Hora de fim do almoço (HH:MM)';

-- ═══════════════════════════════════════
-- 4. CAPACIDADE DOS CARROCÕES
-- ═══════════════════════════════════════
ALTER TABLE carriages 
  ADD COLUMN IF NOT EXISTS capacity_kg DECIMAL(10,2) DEFAULT 300;

COMMENT ON COLUMN carriages.capacity_kg IS 'Capacidade estimada do carrocão em quilogramas';

-- ═══════════════════════════════════════
-- 5. REFERÊNCIA DE MÁQUINA NA SESSÃO DE COLHEITA
-- ═══════════════════════════════════════
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES machines(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════
-- 6. PENALIDADES (caso ainda faltem)
-- ═══════════════════════════════════════
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS attendance_penalty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prod_penalty_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_bonus NUMERIC DEFAULT 0;

-- ═══════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════
SELECT 
  (SELECT COUNT(*) FROM roles) AS total_roles,
  (SELECT COUNT(*) FROM carriages) AS total_carriages;
