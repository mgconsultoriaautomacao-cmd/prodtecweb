-- ============================================================
-- MIGRAÇÃO: Rastreabilidade Avançada (Julian Lot & Assinatura)
-- ============================================================

-- 1. ADICIONAR JULIAN LOT E ASSINATURA EM field_carrao_sessions
ALTER TABLE field_carrao_sessions 
  ADD COLUMN IF NOT EXISTS julian_lot             TEXT,
  ADD COLUMN IF NOT EXISTS digital_signature_base64 TEXT;

-- 2. ADICIONAR COMENTÁRIOS PARA AUDITORIA
COMMENT ON COLUMN field_carrao_sessions.julian_lot IS 'Código de lote baseado no Calendário Juliano (ex: 14124)';
COMMENT ON COLUMN field_carrao_sessions.digital_signature_base64 IS 'Assinatura digital do responsável pela Ordem de Colheita';
