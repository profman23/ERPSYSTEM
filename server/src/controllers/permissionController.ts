/**
 * Permission Controller - HTTP handlers for permission management
 * Uses Zod for validation and enforces tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PermissionService } from '../services/permissionService';
import { tenantContext } from '../middleware/tenantLoader';

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(0).max(1000),
});

export class PermissionController {
  /**
   * GET /api/tenant/permissions - Get permission matrix
   */
  static async getMatrix(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const matrix = await PermissionService.getPermissionMatrix(context.tenantId);
      res.json({ success: true, data: matrix });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/permissions/all - Get all permissions (flat list)
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const permissions = await PermissionService.getAllPermissions(context.tenantId);
      res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/roles/:id/permissions - Get permissions for a role
   */
  static async getRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id: roleId } = req.params;
      const permissionIds = await PermissionService.getRolePermissions(context.tenantId, roleId);
      res.json({ success: true, data: permissionIds });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenant/roles/:id/permissions - Assign permissions to role
   */
  static async assignPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id: roleId } = req.params;
      const { permissionIds } = assignPermissionsSchema.parse(req.body);
      
      const result = await PermissionService.assignPermissionsToRole(context.tenantId, {
        roleId,
        permissionIds,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
