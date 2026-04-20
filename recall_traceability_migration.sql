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
