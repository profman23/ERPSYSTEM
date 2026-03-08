-- ============================================================================
-- Enterprise Performance Indexes - Phase 2.5
-- Created: 2026-02-07
-- Purpose: Add missing composite indexes for 2000+ tenant scale
-- ============================================================================

-- Users: composite for list queries with tenant + active filter
CREATE INDEX IF NOT EXISTS idx_users_tenant_active_email
ON users(tenant_id, is_active, email);

-- Users: composite for list queries with tenant + status
CREATE INDEX IF NOT EXISTS idx_users_tenant_status
ON users(tenant_id, status);

-- DPF User Roles: partial index for active roles only (HOT PATH)
-- Permission checks always filter is_active = 'true', partial index skips inactive
CREATE INDEX IF NOT EXISTS idx_dpf_user_roles_active_only
ON dpf_user_roles(user_id, tenant_id, role_id)
WHERE is_active = 'true';

-- DPF User Custom Permissions: composite for permission resolution
CREATE INDEX IF NOT EXISTS idx_dpf_user_custom_perms_user_tenant_active
ON dpf_user_custom_permissions(user_id, tenant_id, is_active);

-- DPF User Custom Permissions: partial index for active only
CREATE INDEX IF NOT EXISTS idx_dpf_user_custom_perms_active_only
ON dpf_user_custom_permissions(user_id, tenant_id, permission_id)
WHERE is_active = 'true';

-- DPF Role Screen Authorizations: covering index for authorization checks
-- Includes authorization_level to avoid table lookup
CREATE INDEX IF NOT EXISTS idx_dpf_role_screen_auth_covering
ON dpf_role_screen_authorizations(role_id, screen_code)
INCLUDE (authorization_level);

-- DPF Role Permissions: composite for tenant + role permission lookups
CREATE INDEX IF NOT EXISTS idx_dpf_role_permissions_tenant_role_perm
ON dpf_role_permissions(tenant_id, role_id, permission_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
