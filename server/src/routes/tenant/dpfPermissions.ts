/**
 * DPF Permission Routes - /api/tenant/dpf/permissions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController.handle() pattern (no separate controller file).
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFPermissionService } from '../../services/DPFPermissionService';
import {
  listQuerySchema,
  assignPermissionsSchema,
  removePermissionsSchema,
  roleIdParamSchema,
} from '../../validations/dpfPermissionValidation';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// ─── PERMISSION MATRIX ───────────────────────────────────────────────────────
// GET /matrix — hierarchical: modules → screens → actions
// System users without tenantId get system-level matrix.
// Query params: ?systemOnly=true, ?tenantOnly=true
router.get(
  '/matrix',
  requirePermission('dpf.permissions.view'),
  BaseController.handle(async ({ tenantId, query, isSystem }) => {
    const systemOnly = query.systemOnly === 'true';
    const tenantOnly = query.tenantOnly === 'true';

    // System user with no explicit tenantId → system-level matrix
    if (isSystem && !query.tenantId) {
      return DPFPermissionService.getMatrixForSystem({ systemOnly: true, tenantOnly });
    }

    return DPFPermissionService.getMatrix(tenantId, { systemOnly, tenantOnly });
  }),
);

// ─── ALL PERMISSIONS (flat list) ─────────────────────────────────────────────
// GET /all — system users without tenantId get system-level permissions
router.get(
  '/all',
  requirePermission('dpf.permissions.view'),
  BaseController.handle(async ({ tenantId, query, isSystem }) => {
    // System user with no explicit tenantId → system-level permissions
    if (isSystem && !query.tenantId) {
      return DPFPermissionService.getAllForSystem();
    }

    return DPFPermissionService.getAll(tenantId);
  }),
);

// ─── LIST (paginated) ────────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('dpf.permissions.view'),
  BaseController.handle(async ({ tenantId, query }) => {
    const params = listQuerySchema.parse(query);
    const result = await DPFPermissionService.list(tenantId, params);
    return { data: result.data, pagination: result.pagination };
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  requirePermission('dpf.permissions.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFPermissionService.getById(tenantId, params.id);
  }),
);

// ─── ROLE PERMISSIONS ────────────────────────────────────────────────────────
// GET /roles/:roleId/permissions — get permissions assigned to a role
router.get(
  '/roles/:roleId/permissions',
  requirePermission('dpf.permissions.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    const { roleId } = roleIdParamSchema.parse(params);
    const permissionIds = await DPFPermissionService.getRolePermissions(tenantId, roleId);
    return { roleId, permissionIds, count: permissionIds.length };
  }),
);

// ─── ASSIGN PERMISSIONS TO ROLE ──────────────────────────────────────────────
// POST /roles/:roleId/permissions — replaces existing permissions
router.post(
  '/roles/:roleId/permissions',
  requirePermission('dpf.permissions.assign'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      const { roleId } = roleIdParamSchema.parse(params);
      await DPFPermissionService.assignPermissionsToRole(tenantId, {
        roleId,
        permissionIds: validated.permissionIds,
      });
      return { message: `Assigned ${validated.permissionIds.length} permission(s) to role` };
    },
    { bodySchema: assignPermissionsSchema.omit({ roleId: true }) },
  ),
);

// ─── REMOVE PERMISSIONS FROM ROLE ────────────────────────────────────────────
// DELETE /roles/:roleId/permissions — removes specified permissions
router.delete(
  '/roles/:roleId/permissions',
  requirePermission('dpf.permissions.assign'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      const { roleId } = roleIdParamSchema.parse(params);
      await DPFPermissionService.removePermissionsFromRole(tenantId, roleId, validated.permissionIds);
      return { message: `Removed ${validated.permissionIds.length} permission(s) from role` };
    },
    { bodySchema: removePermissionsSchema },
  ),
);

export default router;
