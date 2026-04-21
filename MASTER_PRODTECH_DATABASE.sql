-- ============================================================
-- MIGRAÇÃO: Rastreabilidade Avançada (Julian Lot & Assinatura)
-- ============================================================

-- 1. ADICIONAR JULIAN LOT E ASSINATURA EM field_carrao_sessions
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS julian_lot             TEXT,
  ADD COLUMN IF NOT EXISTS digital_signature_base64 TEXT;

-- 2. ADICIONAR COMENTÁRIOS PARA AUDITORIA
COMMENT ON COLUMN field_carrao_sessions.julian_lot IS 'Código de lote baseado no Calendário Juliano (ex: 14124)';
COMMENT ON COLUMN field_carrao_sessions.digital_signature_base64 IS 'Assinatura digital do responsável pela Ordem de Colheita';
-- ============================================================
-- MIGRAÇÃO: Vendas a Granel e Balanço de Massa
-- ============================================================

-- 1. TABELA DE VENDAS A GRANEL (Bulk Sales)
CREATE TABLE IF NOT EXISTS bulk_sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date        date NOT NULL,
  parcel_id   bigint, -- opcional, se souber de qual parcela veio
  variety_id  bigint,
  weight_kg   decimal(10,2) NOT NULL,
  total_value decimal(10,2),
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_sales_tenant_date ON bulk_sales(tenant_id, date);

-- 2. CONFIGURAÇÃO DE PESO ESTIMADO POR CARRÃO NO TENANT
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS harvest_carrao_weight_kg decimal(10,2) DEFAULT 300.00;

-- 3. RLS PARA bulk_sales
ALTER TABLE bulk_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bulk_sales_tenant ON bulk_sales;
CREATE POLICY bulk_sales_tenant ON bulk_sales
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1));

-- 4. ADICIONAR ROLE 'COLHEDOR' E 'QUALIDADE' AO ENUM OU VALIDAÇÃO (SE HOUVER)
-- Atualmente roles são strings livres, mas é bom documentar:
-- Roles sugeridas: 'admin', 'manager', 'colhedor', 'qualidade'
-- ============================================================
-- PRODTECH SaaS — Script de Migração Multi-Tenant
-- Execute este script UMA VEZ no seu projeto Supabase principal
-- ============================================================

-- 1. TABELA DE TENANTS (empresas clientes)
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,  -- ex: "fazenda-santa-maria"
  plan        text NOT NULL DEFAULT 'pro',
  active      boolean NOT NULL DEFAULT true,
  -- Config WhatsApp (Evolution API)
  evo_api_url text,   -- ex: "https://api.suaevolution.com"
  evo_api_key text,
  evo_instance text,  -- nome da instância
  -- Config horário
  timezone    text DEFAULT 'America/Sao_Paulo',
  created_at  timestamptz DEFAULT now()
);

-- 2. TABELA DE USUÁRIOS POR TENANT
-- Liga o auth.uid() do Supabase Auth ao tenant_id
CREATE TABLE IF NOT EXISTS tenant_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'admin',  -- 'admin' | 'viewer'
  whatsapp    text,  -- número para receber relatórios (ex: "5511999999999")
  created_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 3. ADICIONAR tenant_id NAS TABELAS EXISTENTES
ALTER TABLE employees         ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE box_weights        ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE production_scans  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE daily_summaries    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Também adicionar whatsapp e photo_url em employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp   text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url  text;

-- 4. FUNÇÃO AUXILIAR — pega o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_weights        ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_scans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries    ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES DE ISOLAMENTO POR TENANT

-- tenants: usuário vê apenas o seu
DROP POLICY IF EXISTS tenant_self ON tenants;
CREATE POLICY tenant_self ON tenants
  FOR ALL USING (id = get_my_tenant_id());

-- tenant_users: apenas do seu tenant
DROP POLICY IF EXISTS tu_tenant ON tenant_users;
CREATE POLICY tu_tenant ON tenant_users
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- employees
DROP POLICY IF EXISTS emp_tenant ON employees;
CREATE POLICY emp_tenant ON employees
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- box_weights
DROP POLICY IF EXISTS bw_tenant ON box_weights;
CREATE POLICY bw_tenant ON box_weights
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- production_scans
DROP POLICY IF EXISTS ps_tenant ON production_scans;
CREATE POLICY ps_tenant ON production_scans
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- daily_summaries
DROP POLICY IF EXISTS ds_tenant ON daily_summaries;
CREATE POLICY ds_tenant ON daily_summaries
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- 7. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_employees_tenant        ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_box_weights_tenant      ON box_weights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_scans_tenant ON production_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_tenant  ON daily_summaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user       ON tenant_users(user_id);

-- ============================================================
-- COMO CRIAR UM NOVO CLIENTE:
--
-- 1. No Supabase Auth Dashboard, crie o usuário do cliente (Admin)
--    → Authentication → Users → Invite User
--
-- 2. Copie o user_id gerado e rodeo SQL abaixo:
--
-- INSERT INTO tenants (name, slug, evo_api_url, evo_api_key, evo_instance)
-- VALUES ('Fazenda Santa Maria', 'fazenda-santa-maria', 'https://...', 'key', 'instance');
--
-- INSERT INTO tenant_users (tenant_id, user_id, role, whatsapp)
-- VALUES ('<tenant_id_acima>', '<user_id_auth>', 'admin', '5511999999999');
--
-- 3. Configurar o app Electron no galpão do cliente:
--    → Config → Supabase URL + Key + Tenant ID
-- ============================================================
-- ============================================================
-- MIGRAÇÃO: Rastreabilidade e Recall (Balanço de Massa Cardex)
-- ============================================================

-- 1. ADICIONAR CAMPOS DE RECALL EM bulk_sales
ALTER TABLE bulk_sales 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_num   TEXT,   -- Nota Fiscal
  ADD COLUMN IF NOT EXISTS is_waste      BOOLEAN DEFAULT FALSE;

-- 2. ADICIONAR CAMPOS DE REFUGO EM field_carrao_sessions
ALTER TABLE field_carrao_sessions
  ADD COLUMN IF NOT EXISTS waste_kg      DECIMAL(10,2) DEFAULT 0;

-- 3. ADICIONAR COMENTÁRIOS PARA AUDITORIA
COMMENT ON COLUMN bulk_sales.customer_name IS 'Nome do cliente para rastreabilidade de recall';
COMMENT ON COLUMN bulk_sales.invoice_num   IS 'Número da Nota Fiscal (NF) para auditoria';
COMMENT ON COLUMN field_carrao_sessions.waste_kg IS 'Refugo estimado em campo (não transportado para packing)';
-- ============================================================
-- PRODTECH — Migração de Sincronização e Multi-Tenant Completa
-- ============================================================

-- 1. ADICIONAR tenant_id NAS TABELAS DE SUPORTE
ALTER TABLE parcels    ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE fruits     ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE varieties  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- 2. CRIAR TABELA DE DEFEITOS (QUALITY ISSUES)
CREATE TABLE IF NOT EXISTS quality_issues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text DEFAULT '❓',
  description text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 3. HABILITAR RLS
ALTER TABLE parcels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fruits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE varieties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;

-- 4. POLÍCIAS DE ISOLAMENTO POR TENANT
-- (Usando a mesma lógica do multi_tenant_migration.sql)

DROP POLICY IF EXISTS parcel_tenant ON parcels;
CREATE POLICY parcel_tenant ON parcels FOR ALL USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS fruit_tenant ON fruits;
CREATE POLICY fruit_tenant ON fruits FOR ALL USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS variety_tenant ON varieties;
CREATE POLICY variety_tenant ON varieties FOR ALL USING (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS qi_tenant ON quality_issues;
CREATE POLICY qi_tenant ON quality_issues FOR ALL USING (tenant_id = get_my_tenant_id());

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_parcels_tenant ON parcels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fruits_tenant  ON fruits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_varieties_tenant ON varieties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qi_tenant ON quality_issues(tenant_id);
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
const SUPA_URL = 'https://gknpviqughywjuuqnfmf.supabase.co';
