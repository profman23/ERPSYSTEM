/**
 * User Role Controller - HTTP handlers for user-role assignment
 * Uses Zod for validation and enforces tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRoleService } from '../services/userRoleService';
import { tenantContext } from '../middleware/tenantLoader';
import { authContext } from '../middleware/authMiddleware';

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

export class UserRoleController {
  /**
   * POST /api/tenant/users/:id/assign-role - Assign role to user
   */
  static async assignRole(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantCtx = tenantContext.getStore();
      const authCtx = authContext.getStore();
      if (!tenantCtx?.tenantId) throw new Error('Tenant context not found');
      if (!authCtx?.user) throw new Error('Auth context not found');
      
      const { id: userId } = req.params;
      const { roleId, expiresAt } = assignRoleSchema.parse(req.body);

      const result = await UserRoleService.assignRoleToUser(
        tenantCtx.tenantId,
        authCtx.user.id,
        {
          userId,
          roleId,
          expiresAt,
        }
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tenant/users/:id/role - Remove role from user
   */
  static async removeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id: userId } = req.params;
      const result = await UserRoleService.removeRoleFromUser(context.tenantId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/users/with-roles - Get all users with their roles
   */
  static async getUsersWithRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const users = await UserRoleService.getUsersWithRoles(context.tenantId);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/users/:id/role - Get user's current role
   */
  static async getUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id: userId } = req.params;
      const userRole = await UserRoleService.getUserRole(context.tenantId, userId);
      res.json({ success: true, data: userRole });
    } catch (error) {
      next(error);
    }
  }
}
