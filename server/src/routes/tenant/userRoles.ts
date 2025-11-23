/**
 * User Role Assignment Routes - /api/tenant/users/:id/role
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 */

import { Router } from 'express';
import { UserRoleController } from '../../controllers/userRoleController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router({ mergeParams: true });

router.post(
  '/',
  requirePermission('users.assign_role'),
  UserRoleController.assignRole
);

router.delete(
  '/',
  requirePermission('users.assign_role'),
  UserRoleController.removeRole
);

router.get(
  '/',
  requirePermission('users.view'),
  UserRoleController.getUserRole
);

export default router;
