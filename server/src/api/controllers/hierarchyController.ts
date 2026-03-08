/**
 * Hierarchy Controller
 * Manages multi-tenant hierarchy: Tenant → Business Line → Branch → User
 * Also handles system user and tenant admin creation
 */

import { Request, Response, NextFunction } from 'express';
import { HierarchyService } from '../../services/HierarchyService';
import { SystemUserService } from '../../services/SystemUserService';
import { ScopeService } from '../../services/ScopeService';
import { AppError, NotFoundError, ForbiddenError } from '../../core/errors';
import { db } from '../../db';
import { tenants, businessLines, branches, users } from '../../db/schemas';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createTenantSchema = z.object({
  code: z.string().min(2, 'Tenant code must be at least 2 characters').max(50, 'Tenant code is too long'),
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(255, 'Organization name is too long'),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  subscriptionPlan: z.enum(['trial', 'standard', 'professional', 'enterprise']).optional(),
  contactEmail: z.string().email('Please enter a valid contact email').optional(),
  contactPhone: z.string().max(50).optional(),
  address: z.string().optional(),
  aiAssistantEnabled: z.boolean().optional().default(false),
});

const createBusinessLineSchema = z.object({
  tenantId: z.string().uuid('Please select a valid tenant'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(50).optional(),
  name: z.string().min(2, 'Business line name must be at least 2 characters').max(255, 'Business line name is too long'),
  businessLineType: z.enum([
    'general', 'veterinary_clinic', 'pet_store', 'emergency', 'surgery', 'grooming', 'pharmacy',
    'laboratory', 'boarding', 'rehabilitation', 'dental', 'imaging', 'specialty', 'mobile'
  ]).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email('Please enter a valid contact email').optional(),
  contactPhone: z.string().max(50).optional(),
});

const createBranchSchema = z.object({
  businessLineId: z.string().uuid('Please select a valid business line'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(50).optional(),
  name: z.string().min(2, 'Branch name must be at least 2 characters').max(255, 'Branch name is too long'),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  address: z.string().optional(),
  buildingNumber: z.string().max(50).optional(),
  district: z.string().max(100).optional(),
  vatRegistrationNumber: z.string().max(50).optional(),
  commercialRegistrationNumber: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Please enter a valid email address').optional(),
  timezone: z.string().max(100).optional(),
});

const createUserSchema = z.object({
  branchId: z.string().uuid('Please select a valid branch'),
  code: z.string().max(50).optional(),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().max(50).optional(),
  accessScope: z.enum(['tenant', 'business_line', 'branch', 'mixed']).optional(),
  allowedBranchIds: z.array(z.string().uuid()).optional().default([]),
  roleId: z.string().uuid('Invalid role ID').optional(),
});

const createSystemUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleCode: z.enum(['SYSTEM_ADMIN', 'SUPPORT_STAFF', 'BILLING_STAFF']).optional(),
  roleId: z.string().uuid().optional(),
}).refine(data => data.roleCode || data.roleId, {
  message: 'Please select a role',
});

const createTenantAdminSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().uuid('Please select a valid tenant'),
});

export const hierarchyController = {
  async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createTenantSchema.parse(req.body);
      const tenant = await HierarchyService.createTenant(validated);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async createBusinessLine(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createBusinessLineSchema.parse(req.body);

      const blQuotaOk = await HierarchyService.validateBusinessLineQuota(validated.tenantId);
      if (!blQuotaOk) {
        throw new AppError('Business line quota exceeded for your subscription plan', 429, 'QUOTA_EXCEEDED');
      }

      const businessLine = await HierarchyService.createBusinessLine(validated);

      res.status(201).json({
        success: true,
        data: businessLine,
        message: 'Business line created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createBranchSchema.parse(req.body);

      // Resolve tenantId from businessLineId for quota check
      const parentBL = await db.query.businessLines.findFirst({
        where: eq(businessLines.id, validated.businessLineId),
      });
      if (!parentBL) {
        throw new NotFoundError('Business line');
      }

      const branchQuotaOk = await HierarchyService.validateBranchQuota(parentBL.tenantId);
      if (!branchQuotaOk) {
        throw new AppError('Branch quota exceeded for your subscription plan', 429, 'QUOTA_EXCEEDED');
      }

      const branch = await HierarchyService.createBranch(validated);

      res.status(201).json({
        success: true,
        data: branch,
        message: 'Branch created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);

      // Resolve tenantId from branchId for quota check
      const parentBranch = await db.query.branches.findFirst({
        where: eq(branches.id, validated.branchId),
      });
      if (!parentBranch) {
        throw new NotFoundError('Branch');
      }

      const userQuotaOk = await HierarchyService.validateUserQuota(parentBranch.tenantId);
      if (!userQuotaOk) {
        throw new AppError('User quota exceeded for your subscription plan', 429, 'QUOTA_EXCEEDED');
      }

      const user = await HierarchyService.createUser(validated);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async getTenantHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;

      const hierarchy = await HierarchyService.getTenantHierarchy(tenantId);
      if (!hierarchy) {
        throw new NotFoundError('Tenant');
      }

      res.json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserContext(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const context = await HierarchyService.resolveUserContext(userId);
      if (!context) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: context,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserScope(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const scope = await ScopeService.resolveUserScope(userId);
      if (!scope) {
        throw new NotFoundError('User');
      }

      const accessibleBranches = await ScopeService.getAccessibleBranches(userId);
      const accessibleBusinessLines = await ScopeService.getAccessibleBusinessLines(userId);

      res.json({
        success: true,
        data: {
          scope,
          accessibleBranches,
          accessibleBusinessLines,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a system-level user (SYSTEM PANEL only)
   * System users have no branch/business line and accessScope = 'system'
   */
  async createSystemUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (user.accessScope !== 'system') {
        throw new ForbiddenError('System access required');
      }

      const validated = createSystemUserSchema.parse(req.body);
      const newUser = await SystemUserService.createSystemUser(validated);

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'System user created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a tenant admin user (SYSTEM PANEL only)
   * Tenant admins have accessScope = 'tenant' and belong to a specific tenant
   */
  async createTenantAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (user.accessScope !== 'system') {
        throw new ForbiddenError('System access required');
      }

      const validated = createTenantAdminSchema.parse(req.body);
      const newUser = await SystemUserService.createTenantAdmin(validated);

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Tenant admin created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get available system user roles
   */
  async getSystemUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (user.accessScope !== 'system') {
        throw new ForbiddenError('System access required');
      }

      const roles = SystemUserService.getSystemUserRoles();

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get tenant quota usage info
   * Returns current usage vs limits for business lines, branches, and users
   */
  async getTenantQuotaInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const tenantId = (req.query.tenantId as string) || user?.tenantId;

      if (!tenantId) {
        throw new NotFoundError('Tenant ID');
      }

      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) {
        throw new NotFoundError('Tenant');
      }

      const blList = await db.query.businessLines.findMany({
        where: and(eq(businessLines.tenantId, tenantId), eq(businessLines.isActive, true)),
      });
      const branchList = await db.query.branches.findMany({
        where: and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
      });
      const userList = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), eq(users.isActive, true)),
      });

      res.json({
        success: true,
        data: {
          businessLines: { used: blList.length, limit: tenant.allowedBusinessLines ?? 999999 },
          branches: { used: branchList.length, limit: tenant.allowedBranches ?? 999999 },
          users: { used: userList.length, limit: tenant.allowedUsers ?? 999999 },
          subscriptionPlan: tenant.subscriptionPlan,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default hierarchyController;
