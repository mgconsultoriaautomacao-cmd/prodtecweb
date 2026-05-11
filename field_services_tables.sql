-- Script para criação das tabelas de Apontamento de Campo (Serviços Gerais)
-- Rode isso no painel SQL do seu Supabase.

CREATE TABLE IF NOT EXISTS public.field_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sector TEXT NOT NULL,
    operation TEXT NOT NULL,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE SET NULL,
    variety_id UUID REFERENCES public.varieties(id) ON DELETE SET NULL,
    quantity NUMERIC DEFAULT 0,
    unit TEXT, -- ex: 'Bandejas', 'Metros', 'Caixas'
    total_value NUMERIC NOT NULL DEFAULT 0, -- Valor total em R$
    value_per_employee NUMERIC NOT NULL DEFAULT 0, -- Valor dividido por funcionário
    employee_count INTEGER NOT NULL DEFAULT 0,
    registered_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.field_service_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES public.field_services(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    value_received NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas RLS (Segurança)
ALTER TABLE public.field_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_service_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users (field_services)" ON public.field_services FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable all for authenticated users (field_service_employees)" ON public.field_service_employees FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_service_employees;
