-- Platform Core Layer Database Migration
-- Creates tables for audit logging, quotas, and rate limiting

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36),
    user_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    old_data JSONB,
    new_data JSONB,
    diff JSONB,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    client_ip VARCHAR(45),
    user_agent TEXT,
    trace_id VARCHAR(50),
    correlation_id VARCHAR(50),
    request_path VARCHAR(255),
    request_method VARCHAR(10),
    status_code INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);

-- Tenant Quotas Table
CREATE TABLE IF NOT EXISTS tenant_quotas (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL UNIQUE,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'basic',
    max_users INTEGER NOT NULL DEFAULT 10,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_patients INTEGER NOT NULL DEFAULT 1000,
    max_appointments_per_day INTEGER NOT NULL DEFAULT 50,
    max_api_requests_per_day INTEGER NOT NULL DEFAULT 10000,
    max_storage_mb INTEGER NOT NULL DEFAULT 1000,
    custom_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tenant Quotas Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_quotas_tenant_id ON tenant_quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_plan_tier ON tenant_quotas(plan_tier);

-- Quota Usage Table
CREATE TABLE IF NOT EXISTS quota_usage (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    current_usage INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Quota Usage Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_quota_usage_tenant_resource ON quota_usage(tenant_id, resource_type, period_start);
CREATE INDEX IF NOT EXISTS idx_quota_usage_resource_type ON quota_usage(resource_type);

-- Rate Limit Buckets Table
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    id VARCHAR(36) PRIMARY KEY,
    bucket_key VARCHAR(255) NOT NULL UNIQUE,
    bucket_type VARCHAR(50) NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    last_refill TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Rate Limit Buckets Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_bucket_key ON rate_limit_buckets(bucket_key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON rate_limit_buckets(expires_at);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Enterprise audit trail for compliance and debugging';
COMMENT ON TABLE tenant_quotas IS 'Resource quota limits per tenant and plan tier';
COMMENT ON TABLE quota_usage IS 'Current resource usage tracking per tenant';
COMMENT ON TABLE rate_limit_buckets IS 'Redis fallback for rate limiting state';
