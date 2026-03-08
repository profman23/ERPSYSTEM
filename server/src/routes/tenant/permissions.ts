/**
 * Tenant Permission Routes - /api/tenant/permissions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * Migrated to BaseController.handle() pattern.
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { PermissionService } from '../../services/permissionService';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// ─── GET PERMISSION MATRIX ───────────────────────────────────────────────────
router.get(
  '/matrix',
  requirePermission('permissions.view'),
  BaseController.handle(async ({ tenantId }) => {
    return PermissionService.getPermissionMatrix(tenantId);
  }),
);

// ─── GET ALL PERMISSIONS (flat list) ─────────────────────────────────────────
router.get(
  '/all',
  requirePermission('permissions.view'),
  BaseController.handle(async ({ tenantId }) => {
    return PermissionService.getAllPermissions(tenantId);
  }),
);

export default router;
