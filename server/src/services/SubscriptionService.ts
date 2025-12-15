/**
 * SubscriptionService - Subscription Plan Management
 * 
 * Manages subscription plans and their features.
 * Provides plan limits and validation.
 */

import { db } from '../db';
import { subscriptionFeatures, SUBSCRIPTION_PLANS, SubscriptionPlanType, tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { contextLogger } from '../core/context/contextLogger';

export interface PlanLimits {
  maxUsers: number;
  maxBranches: number;
  maxBusinessLines: number;
  storageLimitGB: number;
  apiRateLimit: number;
  trialDays: number;
  features: Record<string, boolean>;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  plan: SubscriptionPlanType;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async getPlanLimits(planCode: SubscriptionPlanType): Promise<PlanLimits> {
    try {
      const planFeatures = await db.query.subscriptionFeatures.findFirst({
        where: eq(subscriptionFeatures.planCode, planCode),
      });

      if (planFeatures) {
        return {
          maxUsers: planFeatures.maxUsers,
          maxBranches: planFeatures.maxBranches,
          maxBusinessLines: planFeatures.maxBusinessLines,
          storageLimitGB: planFeatures.storageLimitGB,
          apiRateLimit: planFeatures.apiRateLimit,
          trialDays: planFeatures.trialDays || 0,
          features: (planFeatures.features as Record<string, boolean>) || {},
        };
      }
    } catch (error) {
      contextLogger.warn('Failed to fetch plan from DB, using defaults', { planCode, error });
    }

    const defaults = SUBSCRIPTION_PLANS[planCode];
    return {
      ...defaults,
      features: {},
    };
  }

  async getAllPlans(): Promise<Array<{
    code: SubscriptionPlanType;
    name: string;
    limits: PlanLimits;
    isActive: boolean;
  }>> {
    try {
      const plans = await db.query.subscriptionFeatures.findMany({
        orderBy: (table, { asc }) => [asc(table.sortOrder)],
      });

      return plans.map(plan => ({
        code: plan.planCode as SubscriptionPlanType,
        name: plan.planName,
        limits: {
          maxUsers: plan.maxUsers,
          maxBranches: plan.maxBranches,
          maxBusinessLines: plan.maxBusinessLines,
          storageLimitGB: plan.storageLimitGB,
          apiRateLimit: plan.apiRateLimit,
          trialDays: plan.trialDays || 0,
          features: (plan.features as Record<string, boolean>) || {},
        },
        isActive: plan.isActive,
      }));
    } catch (error) {
      contextLogger.warn('Failed to fetch plans from DB, using defaults', { error });

      return Object.entries(SUBSCRIPTION_PLANS).map(([code, limits], index) => ({
        code: code as SubscriptionPlanType,
        name: code.charAt(0).toUpperCase() + code.slice(1),
        limits: { ...limits, features: {} },
        isActive: true,
      }));
    }
  }

  async getTenantSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus | null> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: {
          subscriptionPlan: true,
          trialExpiresAt: true,
          subscriptionExpiresAt: true,
          status: true,
        },
      });

      if (!tenant) {
        return null;
      }

      const now = new Date();
      const plan = tenant.subscriptionPlan as SubscriptionPlanType;
      const isTrial = plan === 'trial';

      let isExpired = false;
      let daysRemaining: number | null = null;

      if (isTrial && tenant.trialExpiresAt) {
        const expiresAt = new Date(tenant.trialExpiresAt);
        isExpired = expiresAt < now;
        daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      } else if (tenant.subscriptionExpiresAt) {
        const expiresAt = new Date(tenant.subscriptionExpiresAt);
        isExpired = expiresAt < now;
        daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      }

      return {
        isActive: tenant.status === 'active' && !isExpired,
        isTrial,
        isExpired,
        daysRemaining,
        plan,
      };
    } catch (error) {
      contextLogger.error('Failed to get tenant subscription status', { tenantId, error });
      return null;
    }
  }

  calculateTrialExpiryDate(trialDays: number = 7): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + trialDays);
    expiryDate.setHours(23, 59, 59, 999);
    return expiryDate;
  }

  async validatePlanUpgrade(
    currentPlan: SubscriptionPlanType,
    targetPlan: SubscriptionPlanType
  ): Promise<{ valid: boolean; reason?: string }> {
    const planOrder: SubscriptionPlanType[] = ['trial', 'standard', 'professional', 'enterprise'];
    
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlan);

    if (currentIndex === -1 || targetIndex === -1) {
      return { valid: false, reason: 'Invalid plan code' };
    }

    if (targetIndex <= currentIndex && currentPlan !== 'trial') {
      return { valid: false, reason: 'Cannot downgrade to a lower plan' };
    }

    return { valid: true };
  }

  async checkTenantWithinLimits(
    tenantId: string
  ): Promise<{ withinLimits: boolean; violations: string[] }> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });

      if (!tenant) {
        return { withinLimits: false, violations: ['Tenant not found'] };
      }

      const violations: string[] = [];
      const limits = await this.getPlanLimits(tenant.subscriptionPlan as SubscriptionPlanType);

      return { withinLimits: violations.length === 0, violations };
    } catch (error) {
      contextLogger.error('Failed to check tenant limits', { tenantId, error });
      return { withinLimits: false, violations: ['Failed to check limits'] };
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();
