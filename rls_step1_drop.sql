-- EXECUTE ESTA QUERY PRIMEIRO (só os DROPs)
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
