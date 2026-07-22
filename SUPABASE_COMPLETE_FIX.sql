-- =====================================================================
-- MASTER SUPABASE SETUP & FIX SCRIPT FOR PRODTECH
-- Execute este script no SQL Editor do seu Supabase para criar todas
-- as tabelas e colunas necessárias com permissões RLS liberadas.
-- =====================================================================

-- 1. TABELA DE CONTROLE DE ETIQUETAS E EMBALAGENS (CERTIFICAÇÃO PACK)
CREATE TABLE IF NOT EXISTS public.controle_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  data DATE DEFAULT CURRENT_DATE,
  hora VARCHAR(10) DEFAULT '07:20',
  cliente VARCHAR(255),
  variedade VARCHAR(255),
  tipo_caixa VARCHAR(255),
  lote_caixa VARCHAR(255),
  caixa_conforme BOOLEAN DEFAULT TRUE,
  sacola_plastica BOOLEAN DEFAULT TRUE,
  bandeja BOOLEAN DEFAULT TRUE,
  codigo_rastreabilidade VARCHAR(255),
  numero_rolo VARCHAR(100),
  etiqueta_entregue TEXT,
  etiqueta_recebida TEXT,
  quantidade_entregue INTEGER DEFAULT 0,
  quantidade_retorno INTEGER DEFAULT 0,
  responsavel VARCHAR(255),
  coord_qualidade VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.controle_etiquetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "controle_etiquetas_all" ON public.controle_etiquetas;
CREATE POLICY "controle_etiquetas_all" ON public.controle_etiquetas FOR ALL USING (true) WITH CHECK (true);

-- 2. TABELA DE ROMANEIOS (EXPEDIÇÃO)
CREATE TABLE IF NOT EXISTS public.romaneios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  cliente VARCHAR(255),
  data_expedicao DATE DEFAULT CURRENT_DATE,
  fazenda VARCHAR(255),
  variedade VARCHAR(255),
  lote VARCHAR(255),
  calibre VARCHAR(50),
  quantidade_pallets INTEGER DEFAULT 1,
  tipo_caixa VARCHAR(255),
  peso_caixa NUMERIC(10,2),
  caixas_pallet INTEGER,
  total_quilos NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.romaneios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "romaneios_all" ON public.romaneios;
CREATE POLICY "romaneios_all" ON public.romaneios FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA DE PALLETS E ESTOQUE 3D WMS
CREATE TABLE IF NOT EXISTS public.pallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  slot_id VARCHAR(50),
  sector VARCHAR(50) DEFAULT 'PACKING',
  variety VARCHAR(255),
  boxes INTEGER DEFAULT 54,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  label_name VARCHAR(255),
  is_misto BOOLEAN DEFAULT FALSE,
  custom_boxes INTEGER,
  caliber VARCHAR(50),
  has_caliber_error BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pallets_all" ON public.pallets;
CREATE POLICY "pallets_all" ON public.pallets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS is_misto BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS custom_boxes INTEGER;
ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS caliber VARCHAR(50);
ALTER TABLE public.pallets ADD COLUMN IF NOT EXISTS has_caliber_error BOOLEAN DEFAULT FALSE;

-- 4. CAPACIDADES DO GALPÃO NO TENANT
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS packing_capacity INTEGER DEFAULT 120;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cold_room_capacity INTEGER DEFAULT 60;

-- 5. TABELA DE RASTREABILIDADE POR PARCELA (INFO_PARCELAS)
CREATE TABLE IF NOT EXISTS public.info_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  parcela VARCHAR(255),
  cultura VARCHAR(255),
  lote VARCHAR(255),
  fornecedor VARCHAR(255),
  plantio DATE,
  semeadura DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.info_parcelas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "info_parcelas_all" ON public.info_parcelas;
CREATE POLICY "info_parcelas_all" ON public.info_parcelas FOR ALL USING (true) WITH CHECK (true);

-- 6. TABELA DE CADERNO DE CAMPO
CREATE TABLE IF NOT EXISTS public.caderno_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  data DATE DEFAULT CURRENT_DATE,
  parcela VARCHAR(255),
  area_ha NUMERIC(10,2),
  cultura VARCHAR(255),
  variedade VARCHAR(255),
  responsavel VARCHAR(255),
  produto VARCHAR(255),
  ingrediente_ativo VARCHAR(255),
  dosagem VARCHAR(100),
  alvo VARCHAR(255),
  carencia_dias INTEGER DEFAULT 0,
  reentrada_horas INTEGER DEFAULT 24,
  volume_calda_l NUMERIC(10,2),
  equipamento VARCHAR(255),
  barrista VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.caderno_campo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caderno_campo_all" ON public.caderno_campo;
CREATE POLICY "caderno_campo_all" ON public.caderno_campo FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.caderno_campo ADD COLUMN IF NOT EXISTS barrista VARCHAR(255);

-- HABILITAR REALTIME NAS NOVAS TABELAS
ALTER PUBLICATION supabase_realtime ADD TABLE public.controle_etiquetas, public.romaneios, public.pallets, public.info_parcelas, public.caderno_campo;
