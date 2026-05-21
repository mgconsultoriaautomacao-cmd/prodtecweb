-- ====================================================================
-- PRODTECH SaaS — Correção de Políticas RLS para Administradores Globais
-- Execute este script no Painel SQL Editor do Supabase
-- ====================================================================

-- 1. Criar função para verificar se o usuário logado é Admin Global
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') IN ('mgconsultoriaautomacao@gmail.com', 'admin@prodtech.com');
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Atualizar Políticas da tabela 'tenants' (Permitir inserção/visualização global)
DROP POLICY IF EXISTS tenant_self ON public.tenants;
CREATE POLICY tenant_self ON public.tenants
  FOR ALL USING (id = get_my_tenant_id() OR is_global_admin());

-- 3. Atualizar Políticas de 'tenant_users' (Permitir gerenciar vínculos globais)
DROP POLICY IF EXISTS tu_tenant ON public.tenant_users;
CREATE POLICY tu_tenant ON public.tenant_users
  FOR ALL USING (user_id = auth.uid() OR is_global_admin());

-- 4. Atualizar Políticas para tabelas de suporte e operacionais (Garantir visualização multi-tenant estável)
DROP POLICY IF EXISTS emp_tenant ON public.employees;
CREATE POLICY emp_tenant ON public.employees
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS bw_tenant ON public.box_weights;
CREATE POLICY bw_tenant ON public.box_weights
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS ps_tenant ON public.production_scans;
CREATE POLICY ps_tenant ON public.production_scans
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS ds_tenant ON public.daily_summaries;
CREATE POLICY ds_tenant ON public.daily_summaries
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS parcel_tenant ON public.parcels;
CREATE POLICY parcel_tenant ON public.parcels
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS fruit_tenant ON public.fruits;
CREATE POLICY fruit_tenant ON public.fruits
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS variety_tenant ON public.varieties;
CREATE POLICY variety_tenant ON public.varieties
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS qi_tenant ON public.quality_issues;
CREATE POLICY qi_tenant ON public.quality_issues
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

DROP POLICY IF EXISTS pl_tenant_all ON public.parcel_links;
CREATE POLICY pl_tenant_all ON public.parcel_links
  FOR ALL USING (tenant_id = get_my_tenant_id() OR is_global_admin());

-- 5. Atualizar Políticas de Colheita de Campo (field_carrao_sessions & employees)
DROP POLICY IF EXISTS "fcs_tenant_all" ON public.field_carrao_sessions;
CREATE POLICY "fcs_tenant_all" ON public.field_carrao_sessions
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()) 
    OR is_global_admin()
  );

DROP POLICY IF EXISTS "fce_tenant_all" ON public.field_carrao_employees;
CREATE POLICY "fce_tenant_all" ON public.field_carrao_employees
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.field_carrao_sessions
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()) OR is_global_admin()
    )
  );

-- 6. Atualizar Vendas a Granel (bulk_sales)
DROP POLICY IF EXISTS "bs_select" ON public.bulk_sales;
DROP POLICY IF EXISTS "bs_insert" ON public.bulk_sales;
DROP POLICY IF EXISTS "bs_update" ON public.bulk_sales;
DROP POLICY IF EXISTS "bulk_sales_tenant" ON public.bulk_sales;

CREATE POLICY "bulk_sales_tenant" ON public.bulk_sales
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()) 
    OR is_global_admin()
  );

-- 7. Atualizar Faltas de Funcionários (employee_absences)
DROP POLICY IF EXISTS "tenant_absences_select" ON public.employee_absences;
DROP POLICY IF EXISTS "tenant_absences_insert" ON public.employee_absences;
DROP POLICY IF EXISTS "tenant_absences_delete" ON public.employee_absences;

CREATE POLICY "tenant_absences_tenant" ON public.employee_absences
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()) 
    OR is_global_admin()
  );
