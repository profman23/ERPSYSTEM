-- SAP B1 Style Authorization Migration
-- Creates the dpf_role_screen_authorizations table for screen-level authorization
-- Authorization Levels: 0 = No Auth, 1 = Read Only, 2 = Full Authorization

-- Create the new SAP B1 style authorization table
CREATE TABLE IF NOT EXISTS dpf_role_screen_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role_id UUID NOT NULL REFERENCES dpf_roles(id) ON DELETE CASCADE,
    screen_code VARCHAR(100) NOT NULL,
    authorization_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    -- Unique constraint: one authorization level per role-screen combination
    CONSTRAINT unique_role_screen UNIQUE (role_id, screen_code)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dpf_role_screen_auth_tenant ON dpf_role_screen_authorizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpf_role_screen_auth_role ON dpf_role_screen_authorizations(role_id);
CREATE INDEX IF NOT EXISTS idx_dpf_role_screen_auth_screen ON dpf_role_screen_authorizations(screen_code);
CREATE INDEX IF NOT EXISTS idx_dpf_role_screen_auth_role_screen ON dpf_role_screen_authorizations(role_id, screen_code);

-- Comment on table and columns
COMMENT ON TABLE dpf_role_screen_authorizations IS 'SAP B1 style screen authorization levels for roles';
COMMENT ON COLUMN dpf_role_screen_authorizations.authorization_level IS '0=No Authorization, 1=Read Only, 2=Full Authorization';
