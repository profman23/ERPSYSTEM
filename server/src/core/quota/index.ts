/**
 * Platform Core Layer - Quota Module
 */

export { quotaService } from './quotaService';
export {
  createQuotaMiddleware,
  apiRequestQuota,
  userQuota,
  branchQuota,
  patientQuota,
  appointmentQuota,
} from './quotaMiddleware';
export type {
  PlanTier,
  ResourceType,
  QuotaLimit,
  QuotaCheckResult,
  TenantQuotaConfig,
  QuotaUsageRecord,
} from './types';
export { PLAN_QUOTAS } from './types';
