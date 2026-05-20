-- ============================================================
-- MIGRAÇÃO V2: Customização Total + Rastreio de Produção
-- ============================================================

-- Garante que a extensão de UUID existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════
-- 0. CRIAÇÃO DAS TABELAS BASE (Caso não existam)
-- ═══════════════════════════════════════

-- SETORES
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- FUNÇÕES (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- OPERAÇÕES (Serviços)
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- CARROCÕES
CREATE TABLE IF NOT EXISTS carriages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Habilitar RLS
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriages ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════
-- 1. EXPANSÃO DE COLUNAS (Customização V2)
-- ═══════════════════════════════════════

-- Roles: Metas e Valores
ALTER TABLE roles 
  ADD COLUMN IF NOT EXISTS target_per_hour DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS value_per_unit DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '👤';

-- Carriages: Capacidade
ALTER TABLE carriages 
  ADD COLUMN IF NOT EXISTS capacity_kg DECIMAL(10,2) DEFAULT 300;

-- ═══════════════════════════════════════
-- 2. TABELA DE MÁQUINAS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS machines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT,
  type        TEXT DEFAULT 'COLHEITADEIRA', 
  status      TEXT DEFAULT 'ATIVO',         
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════
-- 3. CONFIGURAÇÕES DO TENANT (Carga Horária)
-- ═══════════════════════════════════════
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS work_start_time TEXT DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS work_end_time TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS lunch_start_time TEXT DEFAULT '11:30',
  ADD COLUMN IF NOT EXISTS lunch_end_time TEXT DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS attendance_penalty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prod_penalty_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_bonus NUMERIC DEFAULT 0;

-- ═══════════════════════════════════════
-- 4. REFERÊNCIAS NA SESSÃO DE COLHEITA
-- ═══════════════════════════════════════
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS carriage_id UUID REFERENCES carriages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES machines(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════
-- 5. POLÍTICAS RLS (Garantir acesso por tenant)
-- ═══════════════════════════════════════

-- Função para verificar acesso ao tenant (simplificada)
CREATE OR REPLACE FUNCTION get_user_tenants() 
RETURNS SETOF UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Aplicar políticas (usando DROP p/ garantir atualização)
DROP POLICY IF EXISTS "tenant_sectors_all" ON sectors;
CREATE POLICY "tenant_sectors_all" ON sectors FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

DROP POLICY IF EXISTS "tenant_roles_all" ON roles;
CREATE POLICY "tenant_roles_all" ON roles FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

DROP POLICY IF EXISTS "tenant_ops_all" ON operations;
CREATE POLICY "tenant_ops_all" ON operations FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

DROP POLICY IF EXISTS "tenant_carriages_all" ON carriages;
CREATE POLICY "tenant_carriages_all" ON carriages FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

DROP POLICY IF EXISTS "tenant_machines_all" ON machines;
CREATE POLICY "tenant_machines_all" ON machines FOR ALL USING (tenant_id IN (SELECT get_user_tenants()));

-- ═══════════════════════════════════════
-- FIM DA MIGRAÇÃO
-- ═══════════════════════════════════════
