-- 🚀 PRODTECH AGRO-PREMIUM: MASTER DATABASE SCHEMA
-- PostgreSQL / Supabase
-- Suporte Multi-tenant Completo (Matriz + Unidades)

-- 1. Empresas (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    culture_type TEXT DEFAULT 'MELAO', -- MAMAO, MELAO, UVA, etc
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Vínculo Usuários -> Empresas (Controle de Acesso)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    tenant_id UUID REFERENCES tenants(id),
    role TEXT NOT NULL DEFAULT 'OPERATOR', -- MATRIZ, ADMIN, MANAGER, OPERATOR
    whatsapp TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Funcionários
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- PACKER, STACKER, HARVESTER
    whatsapp TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, barcode)
);

-- 4. Áreas e Produtos (Rastreabilidade)
CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    code TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS fruits (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    harvest_weight NUMERIC DEFAULT 300, -- Peso padrão do carrocão em KG
    active BOOLEAN DEFAULT true
);

-- 5. Configurações de Caixa
CREATE TABLE IF NOT EXISTS box_weights (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    weight_kg NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true
);

-- 6. O Coração: Escaneamentos de Produção (Time-Series)
CREATE TABLE IF NOT EXISTS production_scans (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    ts TIMESTAMPTZ DEFAULT now(),
    station_id TEXT DEFAULT 'ST01',
    employee_id BIGINT REFERENCES employees(id),
    parcel_id INT REFERENCES parcels(id),
    fruit_id INT REFERENCES fruits(id),
    weight_id INT REFERENCES box_weights(id),
    raw_barcode TEXT,
    synced_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Resumos Diários (Performance para Dashboard)
CREATE TABLE IF NOT EXISTS daily_summaries (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    date DATE NOT NULL,
    employee_name TEXT,
    role TEXT,
    total_boxes INT DEFAULT 0,
    total_kg NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, date, employee_name)
);

-- 🛡️ POLÍTICAS DE SEGURANÇA (RLS) - Exemplo básico
-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_scans ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê dados do seu próprio tenant_id
-- (Exceto se a role for 'MATRIZ')
CREATE POLICY tenant_isolation_policy ON production_scans
    FOR ALL
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            OR role = 'MATRIZ'
        )
    );
