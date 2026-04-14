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
