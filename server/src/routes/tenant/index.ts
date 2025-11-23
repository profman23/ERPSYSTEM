/**
 * Tenant Routes Index - Mounts all tenant-scoped routes
 * Base path: /api/tenant
 * All routes automatically protected by authMiddleware + tenantLoader
 */

import { Router } from 'express';
import rolesRouter from './roles';
import permissionsRouter from './permissions';
import rolePermissionsRouter from './rolePermissions';
import userRolesRouter from './userRoles';
import { UserRoleController } from '../../controllers/userRoleController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

router.use('/roles', rolesRouter);

router.use('/roles/:id/permissions', rolePermissionsRouter);

router.use('/permissions', permissionsRouter);

router.use('/users/:id/role', userRolesRouter);

router.get(
  '/users/with-roles',
  requirePermission('users.view'),
  UserRoleController.getUsersWithRoles
);

export default router;
