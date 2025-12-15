/**
 * TenantSetupService - Complete Tenant Creation Orchestrator
 * 
 * Single service that:
 * 1. Saves basic tenant data
 * 2. Sets user limits based on subscription plan
 * 3. Copies DPF Structure from Template
 * 4. Adds heavy tasks to Queue (async)
 */

import { db } from '../db';
import { tenants, NewTenant, MIDDLE_EAST_COUNTRIES, SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../db/schemas';
import { eq } from 'drizzle-orm';
import { contextLogger } from '../core/context/contextLogger';
import { tenantCodeGenerator } from './TenantCodeGenerator';
import { subscriptionService } from './SubscriptionService';
import { dpfTemplateService } from './DPFTemplateService';
import { queueService } from '../core/queue/queueService';

export interface CreateTenantInput {
  name: string;
  subscriptionPlan: SubscriptionPlanType;
  countryCode: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  primaryColor?: string;
  defaultLanguage?: 'en' | 'ar';
}

export interface UpdateTenantInput {
  name?: string;
  subscriptionPlan?: SubscriptionPlanType;
  countryCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  primaryColor?: string;
  defaultLanguage?: 'en' | 'ar';
  status?: 'active' | 'inactive' | 'suspended';
}

export interface TenantCreationResult {
  success: boolean;
  tenant?: {
    id: string;
    code: string;
    name: string;
  };
  dpfCopyResult?: {
    modulesCreated: number;
    screensCreated: number;
    actionsCreated: number;
    permissionsCreated: number;
  };
  queuedTasks?: string[];
  error?: string;
}

export class TenantSetupService {
  private static instance: TenantSetupService;

  private constructor() {}

  static getInstance(): TenantSetupService {
    if (!TenantSetupService.instance) {
      TenantSetupService.instance = new TenantSetupService();
    }
    return TenantSetupService.instance;
  }

  async createTenant(input: CreateTenantInput): Promise<TenantCreationResult> {
    const startTime = Date.now();

    try {
      const code = await tenantCodeGenerator.generateUniqueCode();

      const country = MIDDLE_EAST_COUNTRIES.find(c => c.code === input.countryCode);
      if (!country) {
        return { success: false, error: 'Invalid country code' };
      }

      const planLimits = await subscriptionService.getPlanLimits(input.subscriptionPlan);

      const trialExpiresAt = input.subscriptionPlan === 'trial'
        ? subscriptionService.calculateTrialExpiryDate(planLimits.trialDays)
        : null;

      const tenantData: NewTenant = {
        code,
        name: input.name,
        subscriptionPlan: input.subscriptionPlan,
        countryCode: input.countryCode,
        country: country.name,
        timezone: country.timezone,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        address: input.address || null,
        primaryColor: input.primaryColor || '#2563EB',
        defaultLanguage: input.defaultLanguage || 'en',
        allowedUsers: planLimits.maxUsers,
        allowedBranches: planLimits.maxBranches,
        allowedBusinessLines: planLimits.maxBusinessLines,
        storageLimitGB: planLimits.storageLimitGB,
        apiRateLimit: planLimits.apiRateLimit,
        subscriptionStartAt: new Date(),
        trialExpiresAt,
        status: 'active',
      };

      const [newTenant] = await db.insert(tenants).values(tenantData).returning();

      const dpfResult = await dpfTemplateService.copyTemplateToTenant(newTenant.id);

      const queuedTasks: string[] = [];

      const auditResult = await queueService.addAuditLog({
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: newTenant.id,
        newData: tenantData as unknown as Record<string, unknown>,
        tenantId: newTenant.id,
      });
      if (auditResult.enqueued && auditResult.jobId) {
        queuedTasks.push(auditResult.jobId);
      }

      const mailResult = await queueService.addMail({
        to: input.contactEmail,
        subject: 'Welcome to Veterinary ERP',
        template: 'tenant-welcome',
        variables: {
          tenantName: input.name,
          tenantCode: code,
          subscriptionPlan: input.subscriptionPlan,
          trialDays: planLimits.trialDays,
        },
      });
      if (mailResult.enqueued && mailResult.jobId) {
        queuedTasks.push(mailResult.jobId);
      }

      const duration = Date.now() - startTime;
      contextLogger.info('Tenant created successfully', {
        tenantId: newTenant.id,
        tenantCode: code,
        subscriptionPlan: input.subscriptionPlan,
        dpfCopied: dpfResult.success,
        durationMs: duration,
      });

      return {
        success: true,
        tenant: {
          id: newTenant.id,
          code: newTenant.code,
          name: newTenant.name,
        },
        dpfCopyResult: dpfResult.success ? {
          modulesCreated: dpfResult.modulesCreated,
          screensCreated: dpfResult.screensCreated,
          actionsCreated: dpfResult.actionsCreated,
          permissionsCreated: dpfResult.permissionsCreated,
        } : undefined,
        queuedTasks,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      contextLogger.error('Failed to create tenant', { error, input });
      return { success: false, error: errorMessage };
    }
  }

  async updateTenant(tenantId: string, input: UpdateTenantInput): Promise<TenantCreationResult> {
    try {
      const existingTenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });

      if (!existingTenant) {
        return { success: false, error: 'Tenant not found' };
      }

      const updateData: Partial<NewTenant> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
      if (input.defaultLanguage !== undefined) updateData.defaultLanguage = input.defaultLanguage;
      if (input.status !== undefined) updateData.status = input.status;

      if (input.countryCode !== undefined) {
        const country = MIDDLE_EAST_COUNTRIES.find(c => c.code === input.countryCode);
        if (!country) {
          return { success: false, error: 'Invalid country code' };
        }
        updateData.countryCode = input.countryCode;
        updateData.country = country.name;
        updateData.timezone = country.timezone;
      }

      if (input.subscriptionPlan !== undefined && input.subscriptionPlan !== existingTenant.subscriptionPlan) {
        const validation = await subscriptionService.validatePlanUpgrade(
          existingTenant.subscriptionPlan as SubscriptionPlanType,
          input.subscriptionPlan
        );

        if (!validation.valid) {
          return { success: false, error: validation.reason };
        }

        const planLimits = await subscriptionService.getPlanLimits(input.subscriptionPlan);
        updateData.subscriptionPlan = input.subscriptionPlan;
        updateData.allowedUsers = planLimits.maxUsers;
        updateData.allowedBranches = planLimits.maxBranches;
        updateData.allowedBusinessLines = planLimits.maxBusinessLines;
        updateData.storageLimitGB = planLimits.storageLimitGB;
        updateData.apiRateLimit = planLimits.apiRateLimit;

        if (existingTenant.subscriptionPlan === 'trial' && input.subscriptionPlan !== 'trial') {
          updateData.trialExpiresAt = null;
          updateData.subscriptionStartAt = new Date();
        }
      }

      const [updatedTenant] = await db.update(tenants)
        .set(updateData)
        .where(eq(tenants.id, tenantId))
        .returning();

      contextLogger.info('Tenant updated successfully', {
        tenantId,
        updatedFields: Object.keys(updateData),
      });

      return {
        success: true,
        tenant: {
          id: updatedTenant.id,
          code: updatedTenant.code,
          name: updatedTenant.name,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      contextLogger.error('Failed to update tenant', { error, tenantId, input });
      return { success: false, error: errorMessage };
    }
  }

  async getTenantById(tenantId: string) {
    try {
      return await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
    } catch (error) {
      contextLogger.error('Failed to get tenant', { tenantId, error });
      return null;
    }
  }

  async listTenants(options: {
    page?: number;
    limit?: number;
    status?: string;
    subscriptionPlan?: string;
  } = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const allTenants = await db.query.tenants.findMany({
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        limit,
        offset,
      });

      const filteredTenants = allTenants.filter(t => t.code !== 'SYSTEM');

      return {
        tenants: filteredTenants,
        pagination: {
          page,
          limit,
          total: filteredTenants.length,
        },
      };
    } catch (error) {
      contextLogger.error('Failed to list tenants', { error });
      return { tenants: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
  }

  async generateTenantCode(): Promise<string> {
    return tenantCodeGenerator.generateInstantCode();
  }
}

export const tenantSetupService = TenantSetupService.getInstance();
