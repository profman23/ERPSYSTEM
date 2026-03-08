/**
 * DPF User-Role Controller - HTTP request handlers for user-role assignment
 * Handles validation, tenant extraction, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { DPFUserRoleService } from '../services/DPFUserRoleService';
import { TenantContext } from '../core/tenant/tenantContext';
import { db } from '../db';
import { tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';
import {
  assignRoleSchema,
  removeRoleSchema,
  userIdParamSchema,
  listUsersWithRolesSchema,
  bulkAssignRoleSchema,
  roleIdParamSchema,
} from '../validations/dpfUserRoleValidation';
import { ZodError } from 'zod';

/**
 * Helper to get SYSTEM tenant ID from database
 */
async function getSystemTenantId(): Promise<string | null> {
  const systemTenant = await db.query.tenants.findFirst({
    where: eq(tenants.code, 'SYSTEM'),
  });
  return systemTenant?.id || null;
}

/**
 * Assign role to user
 * POST /api/tenant/dpf/user-roles
 * SYSTEM users can assign roles via tenantId query param or auto-detect from target user
 */
export const assignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;
    let isSystemTenant = false;

    // Debug logging
    console.log('[DPF assignRole] context:', JSON.stringify(context, null, 2));
    console.log('[DPF assignRole] user:', JSON.stringify(user, null, 2));
    console.log('[DPF assignRole] context?.accessScope:', context?.accessScope);
    console.log('[DPF assignRole] user?.accessScope:', user?.accessScope);

    // SYSTEM users: get tenantId from query param or from target user or use SYSTEM tenant
    // Check both context and req.user for accessScope (fallback for edge cases)
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    console.log('[DPF assignRole] isSystemUser:', isSystemUser);
    if (isSystemUser) {
      const targetUserId = req.body.userId;
      tenantId = (req.query.tenantId as string) || null;

      if (!tenantId && targetUserId) {
        tenantId = await DPFUserRoleService.getUserTenantId(targetUserId);
      }

      // If target user has no tenant (SYSTEM user), use SYSTEM tenant
      if (!tenantId) {
        tenantId = await getSystemTenantId();
        isSystemTenant = true;
      }

      if (!tenantId) {
        res.status(400).json({ error: 'Could not determine tenant. SYSTEM tenant not found in database.' });
        return;
      }
    } else {
      tenantId = TenantContext.getTenantId();
      if (!tenantId) {
        res.status(401).json({ error: 'Tenant context not found' });
        return;
      }
    }

    const assignedBy = req.user?.userId;
    if (!assignedBy) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const input = assignRoleSchema.parse(req.body);
    const result = await DPFUserRoleService.assignRole(tenantId, assignedBy, input, isSystemTenant);

    res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('does not belong to this tenant')
      ) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('inactive role')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
};

/**
 * Remove role from user
 * DELETE /api/tenant/dpf/user-roles/:userId
 * SYSTEM users can remove roles via tenantId query param or auto-detect from target user
 */
export const removeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;
    let isSystemTenant = false;
    const { userId } = userIdParamSchema.parse(req.params);

    // SYSTEM users: get tenantId from query param or from target user or use SYSTEM tenant
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;

      if (!tenantId) {
        tenantId = await DPFUserRoleService.getUserTenantId(userId);
      }

      // If target user has no tenant (SYSTEM user), use SYSTEM tenant
      if (!tenantId) {
        tenantId = await getSystemTenantId();
        isSystemTenant = true;
      }

      if (!tenantId) {
        res.status(400).json({ error: 'Could not determine tenant. SYSTEM tenant not found in database.' });
        return;
      }
    } else {
      tenantId = TenantContext.getTenantId();
      if (!tenantId) {
        res.status(401).json({ error: 'Tenant context not found' });
        return;
      }
    }

    await DPFUserRoleService.removeRole(tenantId, userId, isSystemTenant);

    res.status(200).json({
      success: true,
      message: 'Role removed successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * Get user's current role
 * GET /api/tenant/dpf/user-roles/:userId
 * SYSTEM users can access any user's role via tenantId query param
 */
export const getUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;
    let isSystemTenant = false;

    // SYSTEM users can fetch user roles from any tenant via query param or use SYSTEM tenant
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        // For SYSTEM users, try to get tenantId from the target user
        const { userId } = userIdParamSchema.parse(req.params);
        const userTenant = await DPFUserRoleService.getUserTenantId(userId);
        if (userTenant) {
          tenantId = userTenant;
        } else {
          // If target user has no tenant (SYSTEM user), use SYSTEM tenant
          tenantId = await getSystemTenantId();
          isSystemTenant = true;
        }
      }
      if (!tenantId) {
        res.status(400).json({ error: 'Could not determine tenant. SYSTEM tenant not found in database.' });
        return;
      }
    } else {
      tenantId = TenantContext.getTenantId();
      if (!tenantId) {
        res.status(401).json({ error: 'Tenant context not found' });
        return;
      }
    }

    const { userId } = userIdParamSchema.parse(req.params);
    const userRole = await DPFUserRoleService.getUserRole(tenantId, userId, isSystemTenant);

    // Return 200 with null data if user has no role (instead of 404)
    // This prevents unnecessary console errors on frontend
    res.status(200).json({
      success: true,
      data: userRole || null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get users with a specific role
 * GET /api/tenant/dpf/roles/:roleId/users
 */
export const getUsersWithRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;

    // SYSTEM users can fetch from any tenant via query param
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        tenantId = await getSystemTenantId();
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(400).json({ error: 'Could not determine tenant context' });
      return;
    }

    const { roleId } = roleIdParamSchema.parse(req.params);
    const users = await DPFUserRoleService.getUsersWithRole(tenantId, roleId);

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * List users with their roles (pagination + filtering)
 * GET /api/tenant/dpf/user-roles
 */
export const listUsersWithRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;

    // SYSTEM users can list users from any tenant via query param
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        tenantId = await getSystemTenantId();
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(400).json({ error: 'Could not determine tenant context' });
      return;
    }

    const params = listUsersWithRolesSchema.parse(req.query);
    const result = await DPFUserRoleService.listUsersWithRoles(tenantId, params);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

/**
 * Bulk assign role to multiple users
 * POST /api/tenant/dpf/user-roles/bulk
 */
export const bulkAssignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;

    // SYSTEM users can bulk assign roles via query param
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        tenantId = await getSystemTenantId();
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(400).json({ error: 'Could not determine tenant context' });
      return;
    }

    const assignedBy = req.user?.userId;
    if (!assignedBy) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const input = bulkAssignRoleSchema.parse(req.body);
    const result = await DPFUserRoleService.bulkAssignRole(tenantId, assignedBy, input);

    res.status(200).json({
      success: true,
      message: `Role assigned to ${result.assignedCount} user(s)`,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('does not belong to this tenant')
      ) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message.includes('inactive role')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
};

/**
 * Get user's effective permissions (via role)
 * GET /api/tenant/dpf/user-roles/:userId/permissions
 */
export const getUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    const user = req.user as any;
    let tenantId: string | null;

    // SYSTEM users can fetch user permissions from any tenant via query param
    const isSystemUser = context?.accessScope === 'system' || user?.accessScope === 'system';
    if (isSystemUser) {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        // Try to get tenantId from target user
        const { userId: targetUserId } = userIdParamSchema.parse(req.params);
        tenantId = await DPFUserRoleService.getUserTenantId(targetUserId);
      }
      if (!tenantId) {
        tenantId = await getSystemTenantId();
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(400).json({ error: 'Could not determine tenant context' });
      return;
    }

    const { userId } = userIdParamSchema.parse(req.params);
    const permissions = await DPFUserRoleService.getUserPermissions(tenantId, userId);

    res.status(200).json({
      success: true,
      data: permissions,
      count: permissions.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};
