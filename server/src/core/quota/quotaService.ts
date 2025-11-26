/**
 * Platform Core Layer - Quota Service
 * Multi-tenant resource quota management
 */

import { db } from '../../db';
import { tenantQuotas, quotaUsage } from '../../db/schemas';
import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { RequestContext } from '../context';
import { cacheService, CACHE_KEYS, CACHE_TAGS } from '../cache';
import { auditService } from '../audit';
import {
  PlanTier,
  ResourceType,
  QuotaLimit,
  QuotaCheckResult,
  TenantQuotaConfig,
  PLAN_QUOTAS,
} from './types';

class QuotaService {
  /**
   * Check if a resource action is allowed within quota
   */
  async checkQuota(
    tenantId: string,
    resourceType: ResourceType,
    requestedAmount: number = 1
  ): Promise<QuotaCheckResult> {
    const quota = await this.getTenantQuota(tenantId);
    const usage = await this.getUsage(tenantId, resourceType);
    const limit = this.getLimit(quota, resourceType);

    if (limit === -1) {
      return {
        allowed: true,
        resourceType,
        current: usage,
        limit: -1,
        remaining: -1,
        percentage: 0,
        message: 'Unlimited quota',
      };
    }

    const newUsage = usage + requestedAmount;
    const allowed = newUsage <= limit;
    const percentage = Math.round((usage / limit) * 100);

    return {
      allowed,
      resourceType,
      current: usage,
      limit,
      remaining: Math.max(0, limit - usage),
      percentage,
      message: allowed
        ? undefined
        : `Quota exceeded for ${resourceType}. Current: ${usage}, Limit: ${limit}`,
    };
  }

  /**
   * Increment resource usage
   */
  async incrementUsage(
    tenantId: string,
    resourceType: ResourceType,
    amount: number = 1
  ): Promise<void> {
    const periodStart = this.getPeriodStart(resourceType);
    const periodEnd = this.getPeriodEnd(resourceType);

    const existing = await db
      .select()
      .from(quotaUsage)
      .where(
        and(
          eq(quotaUsage.tenantId, tenantId),
          eq(quotaUsage.resourceType, resourceType),
          eq(quotaUsage.periodStart, periodStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(quotaUsage)
        .set({
          currentUsage: existing[0].currentUsage + amount,
          updatedAt: new Date(),
        })
        .where(eq(quotaUsage.id, existing[0].id));
    } else {
      await db.insert(quotaUsage).values({
        id: `qus_${ulid()}`,
        tenantId,
        resourceType,
        currentUsage: amount,
        periodStart,
        periodEnd,
      });
    }

    await cacheService.invalidateByTags([CACHE_TAGS.QUOTAS]);
  }

  /**
   * Decrement resource usage
   */
  async decrementUsage(
    tenantId: string,
    resourceType: ResourceType,
    amount: number = 1
  ): Promise<void> {
    const periodStart = this.getPeriodStart(resourceType);

    const existing = await db
      .select()
      .from(quotaUsage)
      .where(
        and(
          eq(quotaUsage.tenantId, tenantId),
          eq(quotaUsage.resourceType, resourceType),
          eq(quotaUsage.periodStart, periodStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const newUsage = Math.max(0, existing[0].currentUsage - amount);
      await db
        .update(quotaUsage)
        .set({
          currentUsage: newUsage,
          updatedAt: new Date(),
        })
        .where(eq(quotaUsage.id, existing[0].id));
    }

    await cacheService.invalidateByTags([CACHE_TAGS.QUOTAS]);
  }

  /**
   * Get current usage for a resource type
   */
  async getUsage(tenantId: string, resourceType: ResourceType): Promise<number> {
    const cacheKey = CACHE_KEYS.quota(tenantId, resourceType);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const periodStart = this.getPeriodStart(resourceType);

        const result = await db
          .select()
          .from(quotaUsage)
          .where(
            and(
              eq(quotaUsage.tenantId, tenantId),
              eq(quotaUsage.resourceType, resourceType),
              eq(quotaUsage.periodStart, periodStart)
            )
          )
          .limit(1);

        return result.length > 0 ? result[0].currentUsage : 0;
      },
      { ttl: 60 * 1000, tags: [CACHE_TAGS.QUOTAS], tenantScoped: false }
    );
  }

  /**
   * Get all quota limits for a tenant
   */
  async getAllLimits(tenantId: string): Promise<QuotaLimit[]> {
    const quota = await this.getTenantQuota(tenantId);
    const resourceTypes: ResourceType[] = [
      'users',
      'branches',
      'patients',
      'appointments_daily',
      'api_requests_daily',
      'storage_mb',
    ];

    const limits: QuotaLimit[] = [];

    for (const resourceType of resourceTypes) {
      const usage = await this.getUsage(tenantId, resourceType);
      const limit = this.getLimit(quota, resourceType);

      limits.push({
        resourceType,
        limit,
        current: usage,
        percentage: limit === -1 ? 0 : Math.round((usage / limit) * 100),
      });
    }

    return limits;
  }

  /**
   * Set tenant quota configuration
   */
  async setTenantQuota(
    tenantId: string,
    config: Partial<TenantQuotaConfig>
  ): Promise<void> {
    const existing = await db
      .select()
      .from(tenantQuotas)
      .where(eq(tenantQuotas.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tenantQuotas)
        .set({
          planTier: config.planTier || existing[0].planTier,
          maxUsers: config.limits?.users || existing[0].maxUsers,
          maxBranches: config.limits?.branches || existing[0].maxBranches,
          maxPatients: config.limits?.patients || existing[0].maxPatients,
          maxAppointmentsPerDay:
            config.limits?.appointments_daily || existing[0].maxAppointmentsPerDay,
          maxApiRequestsPerDay:
            config.limits?.api_requests_daily || existing[0].maxApiRequestsPerDay,
          maxStorageMb: config.limits?.storage_mb || existing[0].maxStorageMb,
          customLimits: config.customLimits || existing[0].customLimits,
          updatedAt: new Date(),
        })
        .where(eq(tenantQuotas.id, existing[0].id));
    } else {
      const planLimits = PLAN_QUOTAS[config.planTier || 'basic'];
      await db.insert(tenantQuotas).values({
        id: `tqu_${ulid()}`,
        tenantId,
        planTier: config.planTier || 'basic',
        maxUsers: config.limits?.users || planLimits.users,
        maxBranches: config.limits?.branches || planLimits.branches,
        maxPatients: config.limits?.patients || planLimits.patients,
        maxAppointmentsPerDay:
          config.limits?.appointments_daily || planLimits.appointments_daily,
        maxApiRequestsPerDay:
          config.limits?.api_requests_daily || planLimits.api_requests_daily,
        maxStorageMb: config.limits?.storage_mb || planLimits.storage_mb,
        customLimits: config.customLimits || {},
      });
    }

    await auditService.log({
      action: 'config_changed',
      resourceType: 'tenant_quota',
      resourceId: tenantId,
      newData: config as Record<string, unknown>,
    });

    await cacheService.invalidateByTags([CACHE_TAGS.QUOTAS]);
  }

  /**
   * Get tenant quota configuration
   */
  private async getTenantQuota(tenantId: string): Promise<TenantQuotaConfig> {
    const cacheKey = `tenant-quota:${tenantId}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await db
          .select()
          .from(tenantQuotas)
          .where(eq(tenantQuotas.tenantId, tenantId))
          .limit(1);

        if (result.length === 0) {
          return {
            planTier: 'basic' as PlanTier,
            limits: PLAN_QUOTAS.basic,
          };
        }

        const quota = result[0];
        return {
          planTier: quota.planTier as PlanTier,
          limits: {
            users: quota.maxUsers,
            branches: quota.maxBranches,
            patients: quota.maxPatients,
            appointments_daily: quota.maxAppointmentsPerDay,
            api_requests_daily: quota.maxApiRequestsPerDay,
            storage_mb: quota.maxStorageMb,
          },
          customLimits: quota.customLimits as Partial<Record<ResourceType, number>>,
        };
      },
      { ttl: 5 * 60 * 1000, tags: [CACHE_TAGS.QUOTAS] }
    );
  }

  /**
   * Get limit for a specific resource type
   */
  private getLimit(quota: TenantQuotaConfig, resourceType: ResourceType): number {
    if (quota.customLimits?.[resourceType] !== undefined) {
      return quota.customLimits[resourceType]!;
    }
    return quota.limits[resourceType];
  }

  /**
   * Get period start based on resource type
   */
  private getPeriodStart(resourceType: ResourceType): Date {
    const now = new Date();
    const isDailyResource =
      resourceType === 'appointments_daily' ||
      resourceType === 'api_requests_daily';

    if (isDailyResource) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get period end based on resource type
   */
  private getPeriodEnd(resourceType: ResourceType): Date {
    const start = this.getPeriodStart(resourceType);
    const isDailyResource =
      resourceType === 'appointments_daily' ||
      resourceType === 'api_requests_daily';

    if (isDailyResource) {
      return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    }

    return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}

export const quotaService = new QuotaService();
export default quotaService;
