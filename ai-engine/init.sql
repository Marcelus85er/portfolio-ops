-- Enable vector extension for RAG / Infographics / PDFs
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants Table (Accounts for Dealerships/Clerks)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    active_tools JSONB NOT NULL DEFAULT '[]',
    hitl_mode VARCHAR(20) DEFAULT 'SAFEGUARDS_ONLY',
    max_auto_discount NUMERIC DEFAULT 0,
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

-- Token Utilization & Billing Audit Table
CREATE TABLE IF NOT EXISTS token_billing (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data for Testing
INSERT INTO tenants (id, name, system_prompt, hitl_mode) VALUES 
('clerk_a', 'Clerk A (San Jose)', 'You are a helpful Auto Sales Agent. Use tools to check inventory and process documents.', 'SAFEGUARDS_ONLY');

INSERT INTO inventory (tenant_id, make, model, price) VALUES 
('clerk_a', 'Honda', 'Civic', 12000),
('clerk_a', 'Honda', 'Accord', 15000);