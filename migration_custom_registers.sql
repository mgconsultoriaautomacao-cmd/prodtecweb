-- 1. Tabela de Setores
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- 2. Tabela de Funções (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- 3. Tabela de Operações de Campo (Serviços)
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- 4. Tabela de Carrocões (Carriages)
CREATE TABLE IF NOT EXISTS carriages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- 5. Adicionar referência de carrocão na sessão de colheita
ALTER TABLE field_carrao_sessions ADD COLUMN IF NOT EXISTS carriage_id UUID REFERENCES carriages(id) ON DELETE SET NULL;
ALTER TABLE field_carrao_sessions ADD COLUMN IF NOT EXISTS carriage_code TEXT;

-- 6. Habilitar RLS para as novas tabelas
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriages ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS básicas (acesso por tenant_id)
DO $$ 
BEGIN
    -- Setores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_sectors_all') THEN
        CREATE POLICY "tenant_sectors_all" ON sectors FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
    END IF;
    
    -- Funções
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_roles_all') THEN
        CREATE POLICY "tenant_roles_all" ON roles FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
    END IF;

    -- Operações
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_operations_all') THEN
        CREATE POLICY "tenant_operations_all" ON operations FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
    END IF;
    
    -- Carrocões
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_carriages_all') THEN
        CREATE POLICY "tenant_carriages_all" ON carriages FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
    END IF;
END $$;
