/**
 * DPF Permission Controller - HTTP request handlers for permission management
 * Handles validation, tenant extraction, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { DPFPermissionService } from '../services/DPFPermissionService';
import { TenantContext } from '../core/tenant/tenantContext';
import {
  listQuerySchema,
  assignPermissionsSchema,
  removePermissionsSchema,
  idParamSchema,
  roleIdParamSchema,
} from '../validations/dpfPermissionValidation';
import { ZodError } from 'zod';

/**
 * List permissions with pagination and filtering
 * GET /api/tenant/dpf/permissions
 */
export const listPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const params = listQuerySchema.parse(req.query);
    const result = await DPFPermissionService.list(tenantId, params);

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
 * Get permission by ID
 * GET /api/tenant/dpf/permissions/:id
 */
export const getPermissionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { id } = idParamSchema.parse(req.params);
    const permission = await DPFPermissionService.getById(tenantId, id);

    if (!permission) {
      res.status(404).json({
        success: false,
        error: 'Permission not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: permission,
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
 * Get permission matrix (hierarchical structure)
 * GET /api/tenant/dpf/permissions/matrix
 * Query params:
 *   - systemOnly=true: Returns only SYSTEM modules (platform-wide)
 *   - tenantOnly=true: Returns only tenant modules (non-system)
 */
export const getPermissionMatrix = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    let tenantId: string | null;

    // Parse filter options
    const systemOnly = req.query.systemOnly === 'true';
    const tenantOnly = req.query.tenantOnly === 'true';

    // SYSTEM users can fetch permissions from any tenant via query param
    if (context?.accessScope === 'system') {
      tenantId = (req.query.tenantId as string) || context?.tenantId || null;

      // If no tenantId provided for SYSTEM user, return system-level permissions
      if (!tenantId) {
        const matrix = await DPFPermissionService.getMatrixForSystem({ systemOnly: true, tenantOnly });
        res.status(200).json({
          success: true,
          data: matrix,
        });
        return;
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const matrix = await DPFPermissionService.getMatrix(tenantId, { systemOnly, tenantOnly });

    res.status(200).json({
      success: true,
      data: matrix,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all permissions (flat list)
 * GET /api/tenant/dpf/permissions/all
 * SYSTEM users can pass tenantId query param to fetch permissions from a specific tenant
 */
export const getAllPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    let tenantId: string | null;

    // SYSTEM users can fetch permissions from any tenant via query param
    if (context?.accessScope === 'system') {
      tenantId = (req.query.tenantId as string) || null;
      if (!tenantId) {
        // For SYSTEM users, use SYSTEM tenant permissions if no tenantId specified
        tenantId = context?.tenantId || null;
        // If still no tenantId, we need one
        if (!tenantId) {
          // Get permissions from SYSTEM tenant
          const permissions = await DPFPermissionService.getAllForSystem();
          res.status(200).json({
            success: true,
            data: permissions,
          });
          return;
        }
      }
    } else {
      tenantId = TenantContext.getTenantId();
      if (!tenantId) {
        res.status(401).json({ error: 'Tenant context not found' });
        return;
      }
    }

    const permissions = await DPFPermissionService.getAll(tenantId);

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions assigned to a role
 * GET /api/tenant/dpf/roles/:roleId/permissions
 * SYSTEM users can pass tenantId query param to fetch from a specific tenant
 */
export const getRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    let tenantId: string | null;

    // SYSTEM users can fetch from any tenant via query param, or use SYSTEM tenant
    if (context?.accessScope === 'system') {
      tenantId = (req.query.tenantId as string) || context?.tenantId || null;

      // If no tenantId, get SYSTEM tenant for system-level role permissions
      if (!tenantId) {
        const { db: dbConn } = await import('../db');
        const { tenants } = await import('../db/schemas');
        const systemTenant = await dbConn.query.tenants.findFirst({
          where: (t, { eq }) => eq(t.code, 'SYSTEM'),
        });
        tenantId = systemTenant?.id || null;
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { roleId } = roleIdParamSchema.parse(req.params);
    const permissionIds = await DPFPermissionService.getRolePermissions(tenantId, roleId);

    res.status(200).json({
      success: true,
      data: {
        roleId,
        permissionIds,
        count: permissionIds.length,
      },
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
 * Assign permissions to a role (replaces existing)
 * POST /api/tenant/dpf/roles/:roleId/permissions
 * SYSTEM users can pass tenantId query param to assign in a specific tenant
 */
export const assignPermissionsToRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    let tenantId: string | null;

    // SYSTEM users can assign in any tenant via query param, or use SYSTEM tenant
    if (context?.accessScope === 'system') {
      tenantId = (req.query.tenantId as string) || context?.tenantId || null;

      // If no tenantId, get SYSTEM tenant for system-level role permissions
      if (!tenantId) {
        const { db: dbConn } = await import('../db');
        const { tenants } = await import('../db/schemas');
        const systemTenant = await dbConn.query.tenants.findFirst({
          where: (t, { eq }) => eq(t.code, 'SYSTEM'),
        });
        tenantId = systemTenant?.id || null;
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { roleId } = roleIdParamSchema.parse(req.params);
    const { permissionIds } = assignPermissionsSchema.omit({ roleId: true }).parse(req.body);

    await DPFPermissionService.assignPermissionsToRole(tenantId, { roleId, permissionIds });

    res.status(200).json({
      success: true,
      message: `Assigned ${permissionIds.length} permission(s) to role`,
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
      if (error.message.includes('Invalid permission IDs')) {
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
 * Remove permissions from a role
 * DELETE /api/tenant/dpf/roles/:roleId/permissions
 * SYSTEM users can pass tenantId query param to remove in a specific tenant
 */
export const removePermissionsFromRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const context = TenantContext.getContext();
    let tenantId: string | null;

    // SYSTEM users can remove in any tenant via query param, or use SYSTEM tenant
    if (context?.accessScope === 'system') {
      tenantId = (req.query.tenantId as string) || context?.tenantId || null;

      // If no tenantId, get SYSTEM tenant for system-level role permissions
      if (!tenantId) {
        const { db: dbConn } = await import('../db');
        const { tenants } = await import('../db/schemas');
        const systemTenant = await dbConn.query.tenants.findFirst({
          where: (t, { eq }) => eq(t.code, 'SYSTEM'),
        });
        tenantId = systemTenant?.id || null;
      }
    } else {
      tenantId = TenantContext.getTenantId();
    }

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context not found' });
      return;
    }

    const { roleId } = roleIdParamSchema.parse(req.params);
    const { permissionIds } = removePermissionsSchema.parse(req.body);

    await DPFPermissionService.removePermissionsFromRole(tenantId, roleId, permissionIds);

    res.status(200).json({
      success: true,
      message: `Removed ${permissionIds.length} permission(s) from role`,
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
      if (error.message.includes('Invalid permission IDs')) {
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
