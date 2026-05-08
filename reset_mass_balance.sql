-- ============================================================
-- RESET DE DADOS DE BALANÇO DE MASSA
-- Apaga apenas dados operacionais de produção, preservando
-- cadastros (funcionários, parcelas, configurações, usuários)
-- ============================================================
-- ⚠️  ATENÇÃO: Execute apenas em ambiente de TESTE ou após
--     confirmar que os dados de produção são para treinamento.
--     Esta operação NÃO pode ser desfeita.
-- ============================================================

-- 1. CARROCÕES COLHIDOS (Sessões de Campo)
-- Apaga todas as sessões de colheita (carrocões) e seus vínculos
DELETE FROM field_carrao_employees WHERE TRUE;
DELETE FROM field_carrao_sessions WHERE TRUE;

-- 2. NOTAS IMPORTADAS DO TOTVS (Expedições / Faturamento)
-- Apaga todas as notas fiscais importadas via planilha TOTVS
DELETE FROM expeditions WHERE TRUE;

-- 3. CAIXAS EMBALADAS (Scans de Produção no Packing House)
-- Apaga todos os registros de scan de produção
DELETE FROM production_logs WHERE TRUE;

-- 4. (OPCIONAL) VENDAS A GRANEL E REFUGO
-- Descomente a linha abaixo se quiser apagar também as vendas agranel
-- DELETE FROM bulk_sales WHERE TRUE;

-- 5. (OPCIONAL) REGISTROS DE QUALIDADE (Auditorias)
-- Descomente se quiser apagar auditorias de qualidade
-- DELETE FROM quality_audits WHERE TRUE;

-- 6. (OPCIONAL) FALTAS REGISTRADAS
-- Descomente se quiser apagar o histórico de assiduidade
-- DELETE FROM employee_absences WHERE TRUE;

-- ============================================================
-- POLÍTICAS RLS - CORRIGIR ACESSO À TABELA employee_absences
-- ============================================================

-- Habilitar RLS
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "tenant_absences_select" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_insert" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_update" ON employee_absences;
DROP POLICY IF EXISTS "tenant_absences_delete" ON employee_absences;

-- Criar políticas para usuários autenticados do tenant
CREATE POLICY "tenant_absences_select" ON employee_absences
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_absences_insert" ON employee_absences
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_absences_update" ON employee_absences
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_absences_delete" ON employee_absences
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- ADICIONAR COLUNA fruit_type em bulk_sales (se não existir)
-- ============================================================
ALTER TABLE bulk_sales ADD COLUMN IF NOT EXISTS fruit_type TEXT;

-- ============================================================
-- POLÍTICAS RLS - field_carrao_sessions (App de Campo)
-- ============================================================
ALTER TABLE field_carrao_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcs_select" ON field_carrao_sessions;
DROP POLICY IF EXISTS "fcs_insert" ON field_carrao_sessions;
DROP POLICY IF EXISTS "fcs_update" ON field_carrao_sessions;

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
-- POLÍTICAS RLS - bulk_sales (Venda Agranel)
-- ============================================================
ALTER TABLE bulk_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bs_select" ON bulk_sales;
DROP POLICY IF EXISTS "bs_insert" ON bulk_sales;
DROP POLICY IF EXISTS "bs_update" ON bulk_sales;

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
-- COLUNAS bulk_sales — adicionar todas as opcionais de uma vez
-- ============================================================
ALTER TABLE bulk_sales
  ADD COLUMN IF NOT EXISTS customer_name    TEXT,
  ADD COLUMN IF NOT EXISTS invoice_num      TEXT,
  ADD COLUMN IF NOT EXISTS fruit_type       TEXT,
  ADD COLUMN IF NOT EXISTS is_waste         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_paid          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_received      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signature_base64 TEXT,
  ADD COLUMN IF NOT EXISTS ts               TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- BÔNUS DE ASSIDUIDADE — coluna na tabela tenants
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS attendance_bonus NUMERIC DEFAULT 0;

-- ============================================================
-- Confirmar execução
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM field_carrao_sessions) AS carrocoes_restantes,
  (SELECT COUNT(*) FROM expeditions)           AS notas_restantes,
  (SELECT COUNT(*) FROM production_logs)       AS scans_restantes;
