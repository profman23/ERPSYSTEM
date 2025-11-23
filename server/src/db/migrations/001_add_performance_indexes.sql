-- ================================================================
-- ENTERPRISE SCALABILITY: PERFORMANCE INDEXES MIGRATION
-- ================================================================
-- Purpose: Add missing indexes for 2,000+ branches, 50,000+ users
-- Expected Impact: 100-500x query performance improvement
-- Date: 2025-11-23
-- ================================================================

-- =========================
-- USERS TABLE INDEXES
-- =========================

-- Foreign key indexes (CRITICAL for joins and filtering)
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);
CREATE INDEX IF NOT EXISTS users_branch_id_idx ON users(branch_id);
CREATE INDEX IF NOT EXISTS users_business_line_id_idx ON users(business_line_id);

-- Filtering indexes (for access control queries)
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users(is_active);
CREATE INDEX IF NOT EXISTS users_access_scope_idx ON users(access_scope);

-- Time-based queries (for analytics and reporting)
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);
CREATE INDEX IF NOT EXISTS users_last_login_at_idx ON users(last_login_at);

-- Composite index for tenant-scoped email uniqueness
-- (Allows same email across different tenants)
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_unique_idx 
  ON users(tenant_id, email) WHERE tenant_id IS NOT NULL;

-- Composite index for multi-tenant user queries
CREATE INDEX IF NOT EXISTS users_tenant_active_idx 
  ON users(tenant_id, is_active) WHERE tenant_id IS NOT NULL;

-- =========================
-- AUTH_TOKENS TABLE INDEXES
-- =========================

-- User foreign key index (for user token lookup)
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens(user_id);

-- Token validation index (CRITICAL - hash index for exact match)
CREATE INDEX IF NOT EXISTS auth_tokens_refresh_token_idx ON auth_tokens(refresh_token);

-- Expiry index (for cleanup jobs and validation)
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at_idx ON auth_tokens(expires_at);

-- Composite index for active token queries
CREATE INDEX IF NOT EXISTS auth_tokens_user_expires_idx 
  ON auth_tokens(user_id, expires_at);

-- =========================
-- BRANCHES TABLE INDEXES
-- =========================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS branches_tenant_id_idx ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS branches_business_line_id_idx ON branches(business_line_id);

-- Filtering indexes
CREATE INDEX IF NOT EXISTS branches_is_active_idx ON branches(is_active);

-- Composite unique constraint (tenant-scoped branch codes)
CREATE UNIQUE INDEX IF NOT EXISTS branches_tenant_code_unique_idx 
  ON branches(tenant_id, code);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS branches_tenant_active_idx 
  ON branches(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS branches_business_line_active_idx 
  ON branches(business_line_id, is_active);

-- Geo-based queries
CREATE INDEX IF NOT EXISTS branches_city_idx ON branches(city);

-- =========================
-- BUSINESS_LINES TABLE INDEXES
-- =========================

-- Foreign key index
CREATE INDEX IF NOT EXISTS business_lines_tenant_id_idx ON business_lines(tenant_id);

-- Filtering index
CREATE INDEX IF NOT EXISTS business_lines_is_active_idx ON business_lines(is_active);

-- Composite unique constraint (tenant-scoped business line codes)
CREATE UNIQUE INDEX IF NOT EXISTS business_lines_tenant_code_unique_idx 
  ON business_lines(tenant_id, code);

-- Composite index for active business lines per tenant
CREATE INDEX IF NOT EXISTS business_lines_tenant_active_idx 
  ON business_lines(tenant_id, is_active);

-- =========================
-- ROLES TABLE INDEXES
-- =========================

-- Foreign key index
CREATE INDEX IF NOT EXISTS roles_tenant_id_idx ON roles(tenant_id);

-- Composite unique constraint (role names unique per tenant)
CREATE UNIQUE INDEX IF NOT EXISTS roles_tenant_name_unique_idx 
  ON roles(tenant_id, name);

-- =========================
-- BRANCH_CAPACITY TABLE INDEXES
-- =========================

-- Foreign key index
CREATE INDEX IF NOT EXISTS branch_capacity_branch_id_idx ON branch_capacity(branch_id);

-- Composite index for capacity queries
CREATE INDEX IF NOT EXISTS branch_capacity_branch_allowed_idx 
  ON branch_capacity(branch_id, allowed_user_count);

-- =========================
-- ANALYZE TABLES
-- =========================
-- Update statistics for query optimizer

ANALYZE users;
ANALYZE auth_tokens;
ANALYZE branches;
ANALYZE business_lines;
ANALYZE tenants;
ANALYZE roles;
ANALYZE branch_capacity;

-- =========================
-- VERIFICATION QUERY
-- =========================
-- Run this to verify all indexes were created:
-- SELECT tablename, indexname, indexdef FROM pg_indexes 
-- WHERE schemaname = 'public' ORDER BY tablename, indexname;
