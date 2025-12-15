-- Migration: Add subscription features table and update tenants table
-- Phase: Advanced Tenant Creation System

-- Create subscription_features table
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) NOT NULL UNIQUE,
  plan_name VARCHAR(100) NOT NULL,
  max_users INTEGER NOT NULL,
  max_branches INTEGER NOT NULL,
  max_business_lines INTEGER NOT NULL,
  storage_limit_gb INTEGER NOT NULL,
  api_rate_limit INTEGER NOT NULL,
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add new columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_start_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dpf_template_applied TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tenants_code_idx ON tenants(code);
CREATE INDEX IF NOT EXISTS tenants_status_idx ON tenants(status);
CREATE INDEX IF NOT EXISTS tenants_subscription_plan_idx ON tenants(subscription_plan);
CREATE INDEX IF NOT EXISTS tenants_country_code_idx ON tenants(country_code);
CREATE INDEX IF NOT EXISTS subscription_features_plan_code_idx ON subscription_features(plan_code);

-- Insert default subscription plans
INSERT INTO subscription_features (plan_code, plan_name, max_users, max_branches, max_business_lines, storage_limit_gb, api_rate_limit, trial_days, features, sort_order)
VALUES 
  ('trial', 'Trial', 3, 1, 1, 1, 100, 7, '{"analytics": false, "api_access": false, "priority_support": false}', 1),
  ('standard', 'Standard', 4, 2, 2, 5, 500, 0, '{"analytics": true, "api_access": false, "priority_support": false}', 2),
  ('professional', 'Professional', 6, 5, 3, 20, 2000, 0, '{"analytics": true, "api_access": true, "priority_support": false}', 3),
  ('enterprise', 'Enterprise', 999999, 999999, 999999, 1000, 100000, 0, '{"analytics": true, "api_access": true, "priority_support": true, "custom_branding": true, "sso": true}', 4)
ON CONFLICT (plan_code) DO NOTHING;
