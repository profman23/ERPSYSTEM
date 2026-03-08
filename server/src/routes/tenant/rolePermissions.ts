/**
 * Role Permission Assignment Routes - /api/tenant/roles/:id/permissions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController.handle() pattern.
 */

import { Router } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/controller';
import { PermissionService } from '../../services/permissionService';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router({ mergeParams: true });

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(0).max(1000),
});

// ─── GET ROLE PERMISSIONS ────────────────────────────────────────────────────
router.get(
  '/',
  requirePermission('permissions.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return PermissionService.getRolePermissions(tenantId, params.id);
  }),
);

// ─── ASSIGN PERMISSIONS TO ROLE ──────────────────────────────────────────────
router.post(
  '/',
  requirePermission('permissions.assign'),
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return PermissionService.assignPermissionsToRole(tenantId, {
        roleId: params.id,
        permissionIds: validated.permissionIds,
      });
    },
    { bodySchema: assignPermissionsSchema },
  ),
);

export default router;
