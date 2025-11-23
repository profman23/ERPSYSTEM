/**
 * Role Controller - HTTP handlers for role management
 * Uses Zod for validation and enforces tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RoleService } from '../services/roleService';
import { tenantContext } from '../middleware/tenantLoader';

const createRoleSchema = z.object({
  roleCode: z.string().min(2).max(100),
  roleName: z.string().min(2).max(255),
  roleNameAr: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  roleName: z.string().min(2).max(255).optional(),
  roleNameAr: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});

export class RoleController {
  /**
   * GET /api/tenant/roles - List all roles with pagination
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const query = listRolesQuerySchema.parse(req.query);
      const result = await RoleService.list(context.tenantId, query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/roles/:id - Get single role by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id } = req.params;
      const role = await RoleService.getById(context.tenantId, id);
      
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenant/roles - Create new role
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const input = createRoleSchema.parse(req.body);
      const role = await RoleService.create(context.tenantId, input);
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tenant/roles/:id - Update existing role
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id } = req.params;
      const input = updateRoleSchema.parse(req.body);
      const role = await RoleService.update(context.tenantId, id, input);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tenant/roles/:id - Delete role
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const context = tenantContext.getStore();
      if (!context?.tenantId) throw new Error('Tenant context not found');
      
      const { id } = req.params;
      const result = await RoleService.delete(context.tenantId, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
