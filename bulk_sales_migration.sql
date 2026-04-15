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
