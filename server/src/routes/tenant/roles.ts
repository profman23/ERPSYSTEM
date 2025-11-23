/**
 * Tenant Role Routes - /api/tenant/roles
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 */

import { Router } from 'express';
import { RoleController } from '../../controllers/roleController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

router.get(
  '/',
  requirePermission('roles.view'),
  RoleController.list
);

router.get(
  '/:id',
  requirePermission('roles.view'),
  RoleController.getById
);

router.post(
  '/',
  requirePermission('roles.create'),
  RoleController.create
);

router.patch(
  '/:id',
  requirePermission('roles.update'),
  RoleController.update
);

router.delete(
  '/:id',
  requirePermission('roles.delete'),
  RoleController.delete
);

export default router;
