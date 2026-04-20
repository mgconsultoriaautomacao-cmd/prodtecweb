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
