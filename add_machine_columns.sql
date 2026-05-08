-- Adicionar colunas de máquina de colheita em field_carrao_sessions
ALTER TABLE field_carrao_sessions
  ADD COLUMN IF NOT EXISTS machine_code     TEXT,
  ADD COLUMN IF NOT EXISTS machine_operator TEXT;
