CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants Table with Kill Switch
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    hitl_mode VARCHAR(20) DEFAULT 'SAFEGUARDS_ONLY',
    is_active BOOLEAN DEFAULT TRUE, -- Kill switch: TRUE = ON, FALSE = OFF
    max_auto_discount NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permanent Knowledge Base & Sharable Assets (Clerk Uploads)
CREATE TABLE IF NOT EXISTS tenant_documents (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Isolated Vehicle Inventory per Tenant
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    price NUMERIC NOT NULL,
    status VARCHAR(20) DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token Utilization Audit Table
CREATE TABLE IF NOT EXISTS token_billing (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Update
INSERT INTO tenants (id, name, system_prompt, hitl_mode, is_active) 
VALUES (
    'clerk_a', 
    'Clerk A (San Jose)', 
    'You are an Auto Sales Assistant. Your job is strictly to assist with vehicle inventory, pricing, brochures, and quotes. If a customer asks about unrelated topics or requests options outside auto sales, politely inform them you can only assist with dealership services or offer to connect them to a representative.', 
    'SAFEGUARDS_ONLY',
    TRUE
) ON CONFLICT (id) DO UPDATE 
SET system_prompt = EXCLUDED.system_prompt, is_active = EXCLUDED.is_active;

INSERT INTO inventory (tenant_id, make, model, price) VALUES 
('clerk_a', 'Honda', 'Civic', 12000),
('clerk_a', 'Honda', 'Accord', 15000)
ON CONFLICT DO NOTHING;