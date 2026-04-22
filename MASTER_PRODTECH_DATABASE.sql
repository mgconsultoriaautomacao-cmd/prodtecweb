-- ============================================================
-- MIGRAÇÃO: Rastreabilidade Avançada (Julian Lot & Assinatura)
-- ============================================================

-- 1. ADICIONAR JULIAN LOT E ASSINATURA EM field_carrao_sessions
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS julian_lot             TEXT,
  ADD COLUMN IF NOT EXISTS digital_signature_base64 TEXT,
  ADD COLUMN IF NOT EXISTS ph_signature_base64      TEXT,
  ADD COLUMN IF NOT EXISTS ph_inspector_name       TEXT;

-- 2. ADICIONAR COMENTÁRIOS PARA AUDITORIA
COMMENT ON COLUMN field_carrao_sessions.julian_lot IS 'Código de lote baseado no Calendário Juliano (ex: 40 23 202)';
COMMENT ON COLUMN field_carrao_sessions.digital_signature_base64 IS 'Assinatura digital do responsável pela Colheita';
COMMENT ON COLUMN field_carrao_sessions.ph_signature_base64 IS 'Assinatura digital do responsável pelo Packing House';
COMMENT ON COLUMN field_carrao_sessions.ph_inspector_name IS 'Nome do responsável pelo Packing House';
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
  farm_code   text DEFAULT '4',  -- Código da fazenda para rastreabilidade (1 dígito)
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
-- Note: Esta função pode disparar RLS. Para tabelas críticas, use o user_id direto.
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

-- tenant_users: usuário vê apenas seus próprios registros de vínculo
DROP POLICY IF EXISTS tu_tenant ON tenant_users;
CREATE POLICY tu_tenant ON tenant_users
  FOR ALL USING (user_id = auth.uid());

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
ALTER TABLE fruits     ADD COLUMN IF NOT EXISTS track_code text; -- Código para rastreabilidade (1 dígito)
ALTER TABLE varieties  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE varieties  ADD COLUMN IF NOT EXISTS track_code text; -- Código para rastreabilidade (1 dígito)

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
-- ================================================================
-- 🚀 RECONSTRUÇÃO OPERACIONAL DEFINITIVA (ESTABILIZAÇÃO TOTAL)
-- ================================================================

-- 1. Limpeza de tabelas antigas para evitar conflitos de tipo (CUIDADO: Apaga dados de teste)
DROP TABLE IF EXISTS field_carrao_employees CASCADE;
DROP TABLE IF EXISTS field_carrao_sessions CASCADE;

-- 2. Recriação: field_carrao_sessions
CREATE TABLE field_carrao_sessions (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ts                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  date                DATE         NOT NULL,
  shift               TEXT         NOT NULL CHECK (shift IN ('MANHA', 'TARDE')),
  fruit_type          TEXT         NOT NULL CHECK (fruit_type IN ('MELANCIA', 'MELAO')),
  parcel_id           UUID         REFERENCES parcels(id) ON DELETE SET NULL,
  variety_id          UUID         REFERENCES varieties(id) ON DELETE SET NULL,
  qty_carrocoes       INTEGER      NOT NULL CHECK (qty_carrocoes > 0),
  price_per_carrao    DECIMAL(10,2) NOT NULL,
  total_value         DECIMAL(10,2) NOT NULL,
  value_per_employee  DECIMAL(10,2) NOT NULL,
  employee_count      INTEGER      NOT NULL DEFAULT 1,
  registered_by       TEXT         NOT NULL,
  julian_lot          TEXT,
  ph_signature_base64 TEXT,      -- Assinatura do fiscal (base64)
  ph_inspector_name   TEXT,      -- Nome do fiscal
  waste_kg            DECIMAL(10,2) DEFAULT 0, -- Refugo em campo
  synced              BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. Recriação: field_carrao_employees (M:N)
CREATE TABLE field_carrao_employees (
  session_id     UUID          NOT NULL REFERENCES field_carrao_sessions(id) ON DELETE CASCADE,
  employee_id    UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name  TEXT,         -- Cache do nome para agilidade
  value_received DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (session_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_fce_session ON field_carrao_employees(session_id);

-- 4. Ajuste Definitivo: quality_audits (Garantir UUID e novos campos)
ALTER TABLE quality_audits DROP COLUMN IF EXISTS parcel_id CASCADE;
ALTER TABLE quality_audits DROP COLUMN IF EXISTS variety_id CASCADE;
ALTER TABLE quality_audits ADD COLUMN parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL;
ALTER TABLE quality_audits ADD COLUMN variety_id UUID REFERENCES varieties(id) ON DELETE SET NULL;
ALTER TABLE quality_audits ADD COLUMN IF NOT EXISTS inspector_name TEXT;
ALTER TABLE quality_audits ADD COLUMN IF NOT EXISTS signature_base64 TEXT;

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
-- FINALIZAÇÃO: AJUSTES FINAIS DE RASTREABILIDADE E ASSINATURAS
-- ================================================================

-- 1. Garante colunas de assinatura e lote na tabela de colheita
ALTER TABLE field_carrao_sessions 
    ADD COLUMN IF NOT EXISTS julian_lot           TEXT,
    ADD COLUMN IF NOT EXISTS ph_signature_base64  TEXT,
    ADD COLUMN IF NOT EXISTS ph_inspector_name    TEXT;

-- 2. Garante códigos de rastreabilidade para frutas e variedades
ALTER TABLE fruits    ADD COLUMN IF NOT EXISTS track_code TEXT;
ALTER TABLE varieties ADD COLUMN IF NOT EXISTS track_code TEXT;

-- 3. Garante coluna de fazenda no Tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS farm_code TEXT DEFAULT '4';

-- Sugestão de Preenchimento Inicial
-- UPDATE varieties SET track_code = '1' WHERE name ILIKE '%AMARELO%';
-- UPDATE varieties SET track_code = '2' WHERE name ILIKE '%Pele de Sapo%';
-- UPDATE tenants SET farm_code = '4' WHERE slug = 'BOM JESUS';

-- ================================================================
-- CONSOLIDAÇÃO EXTRAORDINÁRIA: UUID & AUDITORIA (GlobalG.A.P.)
-- ================================================================

-- 1. EXTENSÃO DOS TENANTS (Configurações Profissionais)
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS culture_type             TEXT DEFAULT 'MELAO',
  ADD COLUMN IF NOT EXISTS value_per_carrao         DECIMAL(10,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS target_per_hour_packer   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS target_per_hour_stacker  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS value_per_box_packer     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS value_per_box_stacker    DECIMAL(10,2);

-- 2. SUPORTE A AUDITORIA EM PARCELAS (Código P / IDAR)
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS p_code TEXT;
COMMENT ON COLUMN parcels.p_code IS 'Código IDAR / Código P para o Caderno de Campo (ID Agro-Rastreador)';

-- 3. MIGRAÇÃO UNIFICADA PARA UUID (Resolve Erros 400)
-- Tabelas afetadas: bulk_sales, field_carrao_sessions, quality_audits

-- Bulk Sales
ALTER TABLE bulk_sales DROP COLUMN IF EXISTS parcel_id, DROP COLUMN IF EXISTS variety_id;
ALTER TABLE bulk_sales ADD COLUMN parcel_id UUID REFERENCES parcels(id), ADD COLUMN variety_id UUID REFERENCES varieties(id);

-- Field Carrao Sessions
ALTER TABLE field_carrao_sessions DROP COLUMN IF EXISTS parcel_id;
ALTER TABLE field_carrao_sessions ADD COLUMN parcel_id UUID REFERENCES parcels(id);

-- Quality Audits
ALTER TABLE quality_audits DROP COLUMN IF EXISTS parcel_id;
ALTER TABLE quality_audits ADD COLUMN parcel_id UUID REFERENCES parcels(id);

-- Field Carrao Employees (Join UUID)
ALTER TABLE field_carrao_employees DROP COLUMN IF EXISTS employee_id;
ALTER TABLE field_carrao_employees ADD COLUMN employee_id UUID REFERENCES employees(id);

-- 4. RPC: VINCULAR USUÁRIO POR E-MAIL (Versão Final)
CREATE OR REPLACE FUNCTION link_user_by_email(target_email TEXT, target_tenant_id UUID, target_role TEXT)
RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário com e-mail % não encontrado no sistema.', target_email;
    END IF;
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (target_tenant_id, target_user_id, target_role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = target_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ÍNDICES DE PERFORMANCE PARA RASTREABILIDADE
CREATE INDEX IF NOT EXISTS idx_fcs_parcel_id ON field_carrao_sessions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_qa_parcel_id  ON quality_audits(parcel_id);

-- ================================================================
-- FIX: UNICIDADE MULTI-TENANT (FRUTAS E VARIEDADES)
-- Resolve o erro 409 Conflict ao cadastrar nomes iguais em empresas diferentes
-- ================================================================

-- 1. Limpeza de Frutas
ALTER TABLE fruits DROP CONSTRAINT IF EXISTS fruits_name_key;
ALTER TABLE fruits DROP CONSTRAINT IF EXISTS fruits_tenant_id_name_key; -- caso exista
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fruits_name_key') THEN
        ALTER TABLE fruits DROP CONSTRAINT fruits_name_key;
    END IF;
END $$;
-- Garante que registros antigos sem empresa sejam vinculados (opcional, mas recomendado)
-- UPDATE fruits SET tenant_id = (SELECT tenant_id FROM tenant_users LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE fruits ADD CONSTRAINT fruits_tenant_id_name_key UNIQUE (tenant_id, name);

-- 2. Limpeza de Variedades
ALTER TABLE varieties DROP CONSTRAINT IF EXISTS varieties_name_key;
ALTER TABLE varieties DROP CONSTRAINT IF EXISTS varieties_tenant_id_name_key; -- caso exista
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'varieties_name_key') THEN
        ALTER TABLE varieties DROP CONSTRAINT varieties_name_key;
    END IF;
END $$;
-- UPDATE varieties SET tenant_id = (SELECT tenant_id FROM tenant_users LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE varieties ADD CONSTRAINT varieties_tenant_id_name_key UNIQUE (tenant_id, name);

-- ================================================================
-- FIX: SUPORTE A MÚLTIPLOS VÍNCULOS E ESTABILIDADE DE CARRÕES
-- ================================================================

-- 1. Criação formal da tabela de vínculos (caso não exista)
CREATE TABLE IF NOT EXISTS parcel_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parcel_id   UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    fruit_id    UUID NOT NULL REFERENCES fruits(id) ON DELETE CASCADE,
    variety_id  UUID NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    -- Permite o mesmo fruto em parcelas diferentes, mas evita o exato mesmo vínculo duplicado
    UNIQUE (parcel_id, fruit_id, variety_id) 
);

-- 2. Habilita RLS para parcel_links
ALTER TABLE parcel_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pl_tenant_all ON parcel_links;
CREATE POLICY pl_tenant_all ON parcel_links 
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- 3. FIX: Restaurar Chave Primária em field_carrao_employees
-- Após a migração para UUID em employee_id, a PK original precisa ser restaurada
ALTER TABLE field_carrao_employees DROP CONSTRAINT IF EXISTS field_carrao_employees_pkey;
ALTER TABLE field_carrao_employees ADD PRIMARY KEY (session_id, employee_id);

-- ================================================================
-- 🚀 SCRIPT DE REPARO CONSOLIDADO (FINAL STABILIZATION)
-- ================================================================

-- 1. CORREÇÃO DE FUNCIONÁRIOS (MULTI-TENANT SAFE)
-- Remove travas globais de nome e código de barras que impedem uso em empresas diferentes
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_barcode_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_name_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_tenant_id_barcode_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_tenant_id_name_key;

-- Recria as travas agora vinculadas à empresa (tenant_id)
ALTER TABLE employees ADD CONSTRAINT employees_tenant_id_barcode_key UNIQUE (tenant_id, barcode);
ALTER TABLE employees ADD CONSTRAINT employees_tenant_id_name_key UNIQUE (tenant_id, name);

-- 2. RECONCILIAÇÃO DE TIPOS UUID (OPERAÇÕES)
-- Garante que parcelas e variedades sejam sempre UUID para evitar erro 400
DO $$ 
BEGIN
    -- Quality Audits
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quality_audits' AND column_name='parcel_id' AND data_type='bigint') THEN
        ALTER TABLE quality_audits DROP COLUMN parcel_id;
        ALTER TABLE quality_audits ADD COLUMN parcel_id UUID REFERENCES parcels(id);
    END IF;

    -- Field Carrao Sessions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_carrao_sessions' AND column_name='parcel_id' AND data_type='bigint') THEN
        ALTER TABLE field_carrao_sessions DROP COLUMN parcel_id CASCADE;
        ALTER TABLE field_carrao_sessions ADD COLUMN parcel_id UUID REFERENCES parcels(id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_carrao_sessions' AND column_name='variety_id' AND data_type='bigint') THEN
        ALTER TABLE field_carrao_sessions DROP COLUMN variety_id CASCADE;
        ALTER TABLE field_carrao_sessions ADD COLUMN variety_id UUID REFERENCES varieties(id);
    END IF;

    -- Field Carrao Employees
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='field_carrao_employees' AND column_name='employee_id' AND data_type='bigint') THEN
        ALTER TABLE field_carrao_employees DROP COLUMN employee_id CASCADE;
        ALTER TABLE field_carrao_employees ADD COLUMN employee_id UUID REFERENCES employees(id);
        -- Restaurar PK após recriação da coluna
        ALTER TABLE field_carrao_employees DROP CONSTRAINT IF EXISTS field_carrao_employees_pkey;
        ALTER TABLE field_carrao_employees ADD PRIMARY KEY (session_id, employee_id);
    END IF;
END $$;

-- 3. GARANTIA DE ÍNDICE DE VÍNCULO (UPSERT)
-- Necessário para o comando do painel web funcionar (on_conflict) multi-tenant
ALTER TABLE parcel_links DROP CONSTRAINT IF EXISTS parcel_links_parcel_id_fruit_id_variety_id_key;
ALTER TABLE parcel_links DROP CONSTRAINT IF EXISTS parcel_links_tenant_parcel_fruit_variety_key;
ALTER TABLE parcel_links ADD CONSTRAINT parcel_links_tenant_parcel_fruit_variety_key UNIQUE (tenant_id, parcel_id, fruit_id, variety_id);

-- INSTRUÇÃO FINAL: EXECUTE TODO O BLOCO ACIMA PARA ESTABILIDADE TOTAL
-- ================================================================

-- 4. CONFIGURAÇÃO INICIAL DINÂMICA (Exemplo para o tenant atual)
-- Isso garante que o App de Campo já comece com valores reais
UPDATE deployments SET farm_code = '4', value_per_carrao = 2.00 WHERE farm_code IS NULL;
UPDATE tenants SET farm_code = '4', value_per_carrao = 2.00 WHERE farm_code IS NULL;

-- 5. ÍNDICES DE PERFORMANCE ADICIONAIS
CREATE INDEX IF NOT EXISTS idx_fruits_tenant_active ON fruits(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_varieties_tenant_active ON varieties(tenant_id, active);
