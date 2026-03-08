/**
 * Role Controller - HTTP handlers for role management
 * Uses Zod for validation and enforces tenant isolation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RoleService } from '../services/roleService';
import { TenantContext } from '../core/tenant/tenantContext';
import { db } from '../db';
import { tenants } from '../db/schemas';
import { eq } from 'drizzle-orm';

const createRoleSchema = z.object({
  roleCode: z.string().min(2).max(100),
  roleName: z.string().min(2).max(255),
  roleNameAr: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  isSystemRole: z.boolean().optional(), // For SYSTEM users creating system-level roles
  // SAP B1 style: screen authorizations (screenCode -> level: 0/1/2)
  screenAuthorizations: z.record(z.string(), z.number().min(0).max(2)).optional(),
});

/**
 * Helper to get SYSTEM tenant ID from database
 */
async function getSystemTenantId(): Promise<string | null> {
  const systemTenant = await db.query.tenants.findFirst({
    where: eq(tenants.code, 'SYSTEM'),
  });
  return systemTenant?.id || null;
}

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
  isActive: z.enum(['true', 'false']).optional().transform((val) => val === undefined ? undefined : val === 'true'),
  tenantId: z.string().uuid().optional(), // For SYSTEM users to query specific tenant's roles
  systemOnly: z.enum(['true', 'false']).optional().transform((val) => val === 'true'), // Fetch only system-level roles
});

export class RoleController {
  /**
   * GET /api/tenant/roles/generate-code - Generate unique role code
   * Used for auto-generating role codes when creating new roles
   */
  static async generateCode(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();

      let targetTenantId: string | null = null;

      if (context?.accessScope === 'system') {
        // SYSTEM users generate codes for SYSTEM tenant
        targetTenantId = await getSystemTenantId();
        if (!targetTenantId) {
          return res.status(500).json({
            success: false,
            error: 'SYSTEM tenant not found. Please run seed script.',
          });
        }
      } else {
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const code = await RoleService.generateUniqueRoleCode(targetTenantId);

      res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/roles - List all roles with pagination
   * SYSTEM users can pass tenantId query param to fetch roles from a specific tenant
   * SYSTEM users can pass systemOnly=true to fetch system-level roles (no tenant required)
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const query = listRolesQuerySchema.parse(req.query);

      // For SYSTEM users, allow fetching roles from any tenant via query param
      let targetTenantId: string | null;

      if (context?.accessScope === 'system') {
        // If systemOnly=true, fetch system-level roles (using a special SYSTEM tenant)
        if (query.systemOnly) {
          // For system roles, we use a placeholder tenant ID or query dpf_roles with isSystemRole='true'
          // Return system-level roles from DPF
          const result = await RoleService.listSystemRoles(query);
          return res.json({ success: true, data: result });
        }

        // SYSTEM users must provide tenantId to fetch tenant-specific roles
        if (!query.tenantId) {
          return res.status(400).json({
            success: false,
            error: 'SYSTEM users must provide tenantId query parameter (or systemOnly=true for system roles)'
          });
        }
        targetTenantId = query.tenantId;
      } else {
        // Non-SYSTEM users use their own tenant context
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const result = await RoleService.list(targetTenantId, query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/roles/:id - Get single role by ID
   * SYSTEM users can fetch from any tenant or system-level roles
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;

      let targetTenantId: string | null = null;

      // SYSTEM users — search cross-tenant for system roles
      if (context?.accessScope === 'system') {
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
          const role = await RoleService.getById(targetTenantId, id);
          if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
          }
          return res.json({ success: true, data: role });
        }

        // No tenantId specified — try SYSTEM tenant first, then cross-tenant
        const systemTenantId = await getSystemTenantId();
        if (systemTenantId) {
          const role = await RoleService.getById(systemTenantId, id);
          if (role) {
            return res.json({ success: true, data: role });
          }
        }

        // Not found in SYSTEM tenant — search cross-tenant for system roles
        const crossTenantRole = await RoleService.getSystemRoleById(id);
        if (crossTenantRole) {
          return res.json({ success: true, data: crossTenantRole });
        }

        return res.status(404).json({ success: false, error: 'Role not found' });
      } else {
        // Regular users use their tenant context
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const role = await RoleService.getById(targetTenantId, id);

      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenant/roles - Create new role (SAP B1 style)
   * SYSTEM users can create system-level roles by passing isSystemRole=true
   * Supports screenAuthorizations: { screenCode: level(0/1/2) }
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const input = createRoleSchema.parse(req.body);

      let targetTenantId: string | null = null;

      // SYSTEM users creating system-level roles
      if (context?.accessScope === 'system') {
        if (input.isSystemRole) {
          // Get SYSTEM tenant ID for system-level roles
          targetTenantId = await getSystemTenantId();
          if (!targetTenantId) {
            return res.status(500).json({
              success: false,
              error: 'SYSTEM tenant not found. Please run seed script.'
            });
          }
        } else if (req.query.tenantId) {
          // SYSTEM user creating role for specific tenant
          targetTenantId = req.query.tenantId as string;
        } else {
          return res.status(400).json({
            success: false,
            error: 'SYSTEM users must provide isSystemRole=true or tenantId query parameter'
          });
        }
      } else {
        // Regular users use their tenant context
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      // Use new SAP B1 style with screen authorizations
      const role = await RoleService.createWithAuthorizations(
        targetTenantId,
        input,
        input.screenAuthorizations || {},
        input.isSystemRole
      );
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tenant/roles/:id - Update existing role
   * SYSTEM users can update system-level roles or tenant-specific roles
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;
      const input = updateRoleSchema.parse(req.body);

      let targetTenantId: string | null = null;

      // SYSTEM users
      if (context?.accessScope === 'system') {
        // Check if updating a system role or tenant role
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
        } else {
          // Default to SYSTEM tenant for system-level roles
          targetTenantId = await getSystemTenantId();
          if (!targetTenantId) {
            return res.status(500).json({
              success: false,
              error: 'SYSTEM tenant not found. Please run seed script.'
            });
          }
        }
      } else {
        // Regular users use their tenant context
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const role = await RoleService.update(targetTenantId, id, input);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tenant/roles/:id - Delete role
   * SYSTEM users can delete system-level roles or tenant-specific roles
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;

      let targetTenantId: string | null = null;

      // SYSTEM users
      if (context?.accessScope === 'system') {
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
        } else {
          // Default to SYSTEM tenant for system-level roles
          targetTenantId = await getSystemTenantId();
          if (!targetTenantId) {
            return res.status(500).json({
              success: false,
              error: 'SYSTEM tenant not found. Please run seed script.'
            });
          }
        }
      } else {
        // Regular users use their tenant context
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const result = await RoleService.delete(targetTenantId, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // SAP B1 Style Screen Authorization Endpoints
  // =========================================================================

  /**
   * GET /api/tenant/roles/:id/authorizations - Get role's screen authorizations
   * Returns: { screenCode: authorizationLevel (0/1/2) }
   */
  static async getAuthorizations(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;

      let targetTenantId: string | null = null;

      if (context?.accessScope === 'system') {
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
        } else {
          // Find role's actual tenant via cross-tenant search
          const role = await RoleService.getSystemRoleById(id);
          if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
          }
          targetTenantId = role.tenantId;
        }
      } else {
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const authorizations = await RoleService.getRoleScreenAuthorizations(targetTenantId, id);
      res.json({ success: true, data: authorizations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tenant/roles/:id/authorizations - Set role's screen authorizations (bulk)
   * Body: { screenCode: level (0/1/2), ... }
   */
  static async setAuthorizations(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;

      const authSchema = z.record(z.string(), z.number().min(0).max(2));
      const authorizations = authSchema.parse(req.body);

      let targetTenantId: string | null = null;

      if (context?.accessScope === 'system') {
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
        } else {
          // Find role's actual tenant via cross-tenant search
          const role = await RoleService.getSystemRoleById(id);
          if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
          }
          targetTenantId = role.tenantId;
        }
      } else {
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      await RoleService.setRoleScreenAuthorizations(targetTenantId, id, authorizations);
      res.json({ success: true, message: 'Screen authorizations updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenant/roles/:id/with-authorizations - Get role with its authorizations
   */
  static async getWithAuthorizations(req: Request, res: Response, next: NextFunction) {
    try {
      const context = TenantContext.getContext();
      const { id } = req.params;

      let targetTenantId: string | null = null;

      if (context?.accessScope === 'system') {
        if (req.query.tenantId) {
          targetTenantId = req.query.tenantId as string;
        } else {
          // Find role's actual tenant via cross-tenant search
          const role = await RoleService.getSystemRoleById(id);
          if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
          }
          targetTenantId = role.tenantId;
        }
      } else {
        if (!context?.tenantId) throw new Error('Tenant context not found');
        targetTenantId = context.tenantId;
      }

      const result = await RoleService.getByIdWithAuthorizations(targetTenantId, id);

      if (!result.role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      res.json({
        success: true,
        data: {
          ...result.role,
          screenAuthorizations: result.authorizations
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
