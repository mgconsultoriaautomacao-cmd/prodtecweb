-- Migration: Create controle_etiquetas table for Certificação Pack (Controle de Etiquetas, Caixas e Embalagens)

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
  etiqueta_entregue TEXT, -- Nome e/ou Foto da etiqueta entregue à produção
  etiqueta_recebida TEXT, -- Nome e/ou Foto da etiqueta recebida da produção
  quantidade_entregue INTEGER DEFAULT 0,
  quantidade_retorno INTEGER DEFAULT 0,
  responsavel VARCHAR(255),
  coord_qualidade VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.controle_etiquetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "controle_etiquetas_all" ON public.controle_etiquetas;
CREATE POLICY "controle_etiquetas_all" ON public.controle_etiquetas
  FOR ALL USING (true) WITH CHECK (true);
