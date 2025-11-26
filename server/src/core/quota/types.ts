/**
 * Platform Core Layer - Quota Types
 */

export type PlanTier = 'basic' | 'pro' | 'enterprise' | 'custom';
export type ResourceType =
  | 'users'
  | 'branches'
  | 'patients'
  | 'appointments_daily'
  | 'api_requests_daily'
  | 'storage_mb';

export interface QuotaLimit {
  resourceType: ResourceType;
  limit: number;
  current: number;
  percentage: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  resourceType: ResourceType;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  message?: string;
}

export interface TenantQuotaConfig {
  planTier: PlanTier;
  limits: Record<ResourceType, number>;
  customLimits?: Partial<Record<ResourceType, number>>;
}

export interface QuotaUsageRecord {
  tenantId: string;
  resourceType: ResourceType;
  currentUsage: number;
  periodStart: Date;
  periodEnd: Date;
}

export const PLAN_QUOTAS: Record<PlanTier, Record<ResourceType, number>> = {
  basic: {
    users: 10,
    branches: 1,
    patients: 1000,
    appointments_daily: 50,
    api_requests_daily: 10000,
    storage_mb: 1000,
  },
  pro: {
    users: 50,
    branches: 5,
    patients: 10000,
    appointments_daily: 200,
    api_requests_daily: 50000,
    storage_mb: 10000,
  },
  enterprise: {
    users: 500,
    branches: 50,
    patients: 100000,
    appointments_daily: 2000,
    api_requests_daily: 500000,
    storage_mb: 100000,
  },
  custom: {
    users: -1,
    branches: -1,
    patients: -1,
    appointments_daily: -1,
    api_requests_daily: -1,
    storage_mb: -1,
  },
};
