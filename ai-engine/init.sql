-- 1. Agnostic Tenants Configuration Table
CREATE TABLE IF NOT EXISTS tenants_config (
    tenant_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    system_prompt TEXT NOT NULL,
    default_model VARCHAR(64) DEFAULT 'gpt-4o-mini',
    temperature FLOAT DEFAULT 0.2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed your initial car dealership clerk
INSERT INTO tenants_config (tenant_id, name, system_prompt, default_model)
VALUES (
    'clerk_a',
    'Auto Sales Clerk A',
    'You are a professional automotive sales clerk. Answer customer questions about inventory, vehicle specifications, and quotes concisely. Use the available tools to query live stock and documents. If information is missing, ask brief clarifying questions.',
    'gpt-4o-mini'
) ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Tenant Documents Table (for tracking and deleting parsed PDFs)
CREATE TABLE IF NOT EXISTS tenant_documents (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    content_markdown TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);