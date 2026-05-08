-- EXECUTE ESTA QUERY DEPOIS (só os CREATEs)
CREATE POLICY "fcs_select" ON field_carrao_sessions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "fcs_insert" ON field_carrao_sessions FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "fcs_update" ON field_carrao_sessions FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "bs_select" ON bulk_sales FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "bs_insert" ON bulk_sales FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "bs_update" ON bulk_sales FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_absences_select" ON employee_absences FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_absences_insert" ON employee_absences FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_absences_delete" ON employee_absences FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

ALTER TABLE bulk_sales ADD COLUMN IF NOT EXISTS customer_name TEXT, ADD COLUMN IF NOT EXISTS fruit_type TEXT, ADD COLUMN IF NOT EXISTS invoice_num TEXT, ADD COLUMN IF NOT EXISTS is_waste BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS is_received BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS signature_base64 TEXT, ADD COLUMN IF NOT EXISTS ts TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS attendance_bonus NUMERIC DEFAULT 0;
