/**
 * Role Permission Assignment Routes - /api/tenant/roles/:id/permissions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 */

import { Router } from 'express';
import { PermissionController } from '../../controllers/permissionController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router({ mergeParams: true });

router.get(
  '/',
  requirePermission('permissions.view'),
  PermissionController.getRolePermissions
);

router.post(
  '/',
  requirePermission('permissions.assign'),
  PermissionController.assignPermissions
);

export default router;
