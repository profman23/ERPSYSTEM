/**
 * Tenant Permission Routes - /api/tenant/permissions
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 */

import { Router } from 'express';
import { PermissionController } from '../../controllers/permissionController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

router.get(
  '/matrix',
  requirePermission('permissions.view'),
  PermissionController.getMatrix
);

router.get(
  '/all',
  requirePermission('permissions.view'),
  PermissionController.getAll
);

export default router;
