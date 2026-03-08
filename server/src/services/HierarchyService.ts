/**
 * Hierarchy Service
 * Manages the multi-tenant hierarchy: Tenant → Business Line → Branch → User
 * Handles creation, validation, and hierarchy resolution
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { tenants, businessLines, branches, users, tenantQuotas } from '../db/schemas';
import { auditService } from '../core/audit';
import { RequestContext } from '../core/context';
import { contextLogger } from '../core/context';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRoleService } from './userRoleService';
import { BranchService } from './BranchService';
import { NotFoundError } from '../core/errors';

export interface CreateTenantInput {
  code: string;
  name: string;
  country?: string;
  timezone?: string;
  subscriptionPlan?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  aiAssistantEnabled?: boolean;
}

export interface CreateBusinessLineInput {
  tenantId: string;
  code?: string;
  name: string;
  businessLineType?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateBranchInput {
  businessLineId: string;
  code?: string;
  name: string;
  country?: string;
  city?: string;
  address?: string;
  buildingNumber?: string;
  vatRegistrationNumber?: string;
  commercialRegistrationNumber?: string;
  state?: string;
  postalCode?: string;
  district?: string;
  phone?: string;
  email?: string;
  timezone?: string;
}

export interface CreateUserInput {
  branchId: string;
  code?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  accessScope?: string;
  allowedBranchIds?: string[];
  roleId?: string;
}

export class HierarchyService {
  /**
   * Create a new tenant with quota initialization
   */
  static async createTenant(input: CreateTenantInput) {
    const tenantId = uuidv4();
    
    const [tenant] = await db.insert(tenants).values({
      id: tenantId,
      code: input.code,
      name: input.name,
      country: input.country,
      timezone: input.timezone || 'UTC',
      subscriptionPlan: input.subscriptionPlan || 'trial',
      status: 'active',
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      address: input.address,
      aiAssistantEnabled: input.aiAssistantEnabled ?? false,
    }).returning();

    await db.insert(tenantQuotas).values({
      id: uuidv4(),
      tenantId: tenant.id,
      planTier: input.subscriptionPlan || 'trial',
      maxUsers: this.getQuotaByPlan(input.subscriptionPlan || 'trial').maxUsers,
      maxBranches: this.getQuotaByPlan(input.subscriptionPlan || 'trial').maxBranches,
    });

    await auditService.log({
      action: 'create',
      resourceType: 'tenant',
      resourceId: tenant.id,
      newData: tenant as unknown as Record<string, unknown>,
      severity: 'high',
      metadata: { tenantId: tenant.id },
    });

    contextLogger.info('Tenant created', { tenantId: tenant.id, code: tenant.code });
    
    return tenant;
  }

  /**
   * Create a new business line under a tenant
   */
  static async createBusinessLine(input: CreateBusinessLineInput) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, input.tenantId),
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const autoCode = input.code || `BL-${Date.now().toString(36).toUpperCase()}`;

    const [businessLine] = await db.insert(businessLines).values({
      tenantId: input.tenantId,
      code: autoCode,
      name: input.name,
      businessLineType: input.businessLineType || 'general',
      description: input.description,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
    }).returning();

    await auditService.log({
      action: 'create',
      resourceType: 'business_line',
      resourceId: businessLine.id,
      newData: businessLine as unknown as Record<string, unknown>,
      severity: 'medium',
      metadata: { tenantId: input.tenantId, businessLineId: businessLine.id },
    });

    contextLogger.info('Business line created', { 
      businessLineId: businessLine.id, 
      tenantId: input.tenantId 
    });
    
    return businessLine;
  }

  /**
   * Create a new branch under a business line
   * Delegates to BranchService.create() — single source of truth for branch creation.
   * BranchService handles: code generation, uniqueness check, atomic transaction,
   * default warehouse creation, and 7 document number series seeding.
   */
  static async createBranch(input: CreateBranchInput) {
    const businessLine = await db.query.businessLines.findFirst({
      where: eq(businessLines.id, input.businessLineId),
    });

    if (!businessLine) {
      throw new NotFoundError('BusinessLine', input.businessLineId);
    }

    const tenantId = businessLine.tenantId;

    const branch = await BranchService.create(tenantId, {
      businessLineId: input.businessLineId,
      name: input.name,
      country: input.country || '',
      city: input.city || '',
      address: input.address || '',
      buildingNumber: input.buildingNumber || '',
      vatRegistrationNumber: input.vatRegistrationNumber || 'PENDING',
      commercialRegistrationNumber: input.commercialRegistrationNumber || 'PENDING',
      postalCode: input.postalCode,
      district: input.district,
      phone: input.phone,
      email: input.email,
      timezone: input.timezone,
      isActive: true,
    });

    await auditService.log({
      action: 'create',
      resourceType: 'branch',
      resourceId: branch.id,
      newData: branch as unknown as Record<string, unknown>,
      severity: 'medium',
      metadata: { tenantId, businessLineId: input.businessLineId, branchId: branch.id },
    });

    contextLogger.info('Branch created', {
      branchId: branch.id,
      businessLineId: input.businessLineId,
      tenantId,
    });

    return branch;
  }

  /**
   * Create a new user under a branch
   * Automatically resolves businessLineId and tenantId from parent branch
   */
  static async createUser(input: CreateUserInput) {
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, input.branchId),
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const tenantId = branch.tenantId;
    const businessLineId = branch.businessLineId;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const userCode = input.code || `USR-${Date.now().toString(36).toUpperCase()}`;

    const [user] = await db.insert(users).values({
      code: userCode,
      name: `${input.firstName} ${input.lastName}`.trim(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role || 'staff',
      accessScope: input.accessScope || 'branch',
      status: 'active',
      isActive: true,
      branchId: input.branchId,
      businessLineId,
      tenantId,
      allowedBranchIds: input.allowedBranchIds || [],
    }).returning();

    // Atomic role assignment — if roleId provided, assign in same flow
    if (input.roleId) {
      try {
        await UserRoleService.assignRoleToUser(
          tenantId,
          user.id, // assignedBy = the user being created (system will override)
          { userId: user.id, roleId: input.roleId },
          false
        );
        contextLogger.info('Role assigned atomically', { userId: user.id, roleId: input.roleId, tenantId });
      } catch (roleErr) {
        contextLogger.error('Atomic role assignment failed — user created without role', {
          userId: user.id, roleId: input.roleId, tenantId, error: String(roleErr),
        });
      }
    }

    await auditService.log({
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      newData: { ...user, passwordHash: '[REDACTED]' } as unknown as Record<string, unknown>,
      severity: 'high',
      metadata: { tenantId, businessLineId, branchId: input.branchId, userId: user.id },
    });

    contextLogger.info('User created', {
      userId: user.id,
      branchId: input.branchId,
      businessLineId,
      tenantId
    });

    return { ...user, passwordHash: undefined };
  }

  /**
   * Get full hierarchy for a tenant
   */
  static async getTenantHierarchy(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return null;
    }

    const tenantBusinessLines = await db.query.businessLines.findMany({
      where: eq(businessLines.tenantId, tenantId),
    });

    const hierarchy = await Promise.all(
      tenantBusinessLines.map(async (bl) => {
        const blBranches = await db.query.branches.findMany({
          where: and(
            eq(branches.tenantId, tenantId),
            eq(branches.businessLineId, bl.id)
          ),
        });

        const branchesWithUsers = await Promise.all(
          blBranches.map(async (branch) => {
            const branchUsers = await db.query.users.findMany({
              where: eq(users.branchId, branch.id),
              columns: {
                id: true,
                code: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                accessScope: true,
                isActive: true,
              },
            });

            return {
              ...branch,
              users: branchUsers,
              userCount: branchUsers.length,
            };
          })
        );

        return {
          ...bl,
          branches: branchesWithUsers,
          branchCount: branchesWithUsers.length,
          totalUsers: branchesWithUsers.reduce((sum, b) => sum + b.userCount, 0),
        };
      })
    );

    return {
      ...tenant,
      businessLines: hierarchy,
      businessLineCount: hierarchy.length,
      totalBranches: hierarchy.reduce((sum, bl) => sum + bl.branchCount, 0),
      totalUsers: hierarchy.reduce((sum, bl) => sum + bl.totalUsers, 0),
    };
  }

  /**
   * Resolve user hierarchy context
   */
  static async resolveUserContext(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

    let branch = null;
    let businessLine = null;
    let tenant = null;

    if (user.branchId) {
      branch = await db.query.branches.findFirst({
        where: eq(branches.id, user.branchId),
      });
    }

    if (user.businessLineId) {
      businessLine = await db.query.businessLines.findFirst({
        where: eq(businessLines.id, user.businessLineId),
      });
    }

    if (user.tenantId) {
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, user.tenantId),
      });
    }

    return {
      user: { ...user, passwordHash: undefined },
      branch,
      businessLine,
      tenant,
    };
  }

  /**
   * Get quota limits by subscription plan
   */
  private static getQuotaByPlan(plan: string) {
    const quotas: Record<string, { maxUsers: number; maxBranches: number }> = {
      trial: { maxUsers: 5, maxBranches: 1 },
      standard: { maxUsers: 25, maxBranches: 3 },
      professional: { maxUsers: 100, maxBranches: 10 },
      enterprise: { maxUsers: 1000, maxBranches: 100 },
    };
    return quotas[plan] || quotas.trial;
  }

  /**
   * Validate business line quota before creating a new one
   */
  static async validateBusinessLineQuota(tenantId: string): Promise<boolean> {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) return false;

    const blList = await db.query.businessLines.findMany({
      where: and(eq(businessLines.tenantId, tenantId), eq(businessLines.isActive, true)),
    });
    return blList.length < (tenant.allowedBusinessLines ?? 999999);
  }

  /**
   * Validate branch quota before creating a new one
   */
  static async validateBranchQuota(tenantId: string): Promise<boolean> {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) return false;

    const branchList = await db.query.branches.findMany({
      where: and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
    });
    return branchList.length < (tenant.allowedBranches ?? 999999);
  }

  /**
   * Validate user quota before creating a new one
   */
  static async validateUserQuota(tenantId: string): Promise<boolean> {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) return false;

    const userList = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.isActive, true)),
    });
    return userList.length < (tenant.allowedUsers ?? 999999);
  }

  /**
   * Validate branch capacity before adding user (legacy - now uses tenant.allowedUsers)
   */
  static async validateBranchCapacity(branchId: string): Promise<boolean> {
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });

    if (!branch) return false;

    return this.validateUserQuota(branch.tenantId);
  }
}

export default HierarchyService;
