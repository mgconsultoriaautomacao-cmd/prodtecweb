-- ============================================================
-- PASSO 1: REMOVER POLICIES EXISTENTES
-- ============================================================
DROP POLICY IF EXISTS "fcs_select" ON field_carrao_sessions;
DROP POLICY IF EXISTS "fcs_insert" ON field_carrao_sessions;
DROP POLICY IF EXISTS "fcs_update" ON field_carrao_sessions;
DROP POLICY IF EXISTS "fcs_delete" ON field_carrao_sessions;

DROP POLICY IF EXISTS "bs_select" ON bulk_sales;
DROP POLICY IF EXISTS "bs_insert" ON bulk_sales;
DROP POLICY IF EXISTS "bs_update" ON bulk_sales;

DROP POLICY IF EXISTS "tenant_absences_select" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_insert" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_update" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_delete" ON employee_absences;

-- ============================================================
-- PASSO 2: HABILITAR RLS NAS TABELAS
-- ============================================================
ALTER TABLE field_carrao_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 3: CRIAR POLICIES - field_carrao_sessions
-- ============================================================
CREATE POLICY "fcs_select" ON field_carrao_sessions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "fcs_insert" ON field_carrao_sessions
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "fcs_update" ON field_carrao_sessions
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PASSO 4: CRIAR POLICIES - bulk_sales
-- ============================================================
CREATE POLICY "bs_select" ON bulk_sales
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "bs_insert" ON bulk_sales
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "bs_update" ON bulk_sales
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PASSO 5: CRIAR POLICIES - employee_absences
-- ============================================================
CREATE POLICY "tenant_absences_select" ON employee_absences
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_absences_insert" ON employee_absences
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_absences_delete" ON employee_absences
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PASSO 6: COLUNAS FALTANTES
-- ============================================================
ALTER TABLE bulk_sales
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS fruit_type       TEXT,
  ADD COLUMN IF NOT EXISTS invoice_num      TEXT,
  ADD COLUMN IF NOT EXISTS is_waste         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_received      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_base64 TEXT,
  ADD COLUMN IF NOT EXISTS ts               TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS attendance_bonus NUMERIC DEFAULT 0;

-- ============================================================
-- VERIFICAR RESULTADO
-- ============================================================
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('field_carrao_sessions', 'bulk_sales', 'employee_absences')
ORDER BY tablename, cmd;
