/**
 * DPF User-Role Routes - /api/tenant/dpf/user-roles
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 */

import { Router } from 'express';
import {
  assignRole,
  removeRole,
  getUserRole,
  getUsersWithRole,
  listUsersWithRoles,
  bulkAssignRole,
  getUserPermissions,
} from '../../controllers/dpfUserRoleController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

/**
 * GET /api/tenant/dpf/user-roles
 * List users with their roles (pagination + filtering)
 * Permission: users.view
 */
router.get(
  '/',
  requirePermission('users.view'),
  listUsersWithRoles
);

/**
 * POST /api/tenant/dpf/user-roles
 * Assign role to user (replaces existing role - ONE ROLE PER USER model)
 * Permission: users.assign_role
 */
router.post(
  '/',
  requirePermission('users.assign_role'),
  assignRole
);

/**
 * POST /api/tenant/dpf/user-roles/bulk
 * Bulk assign role to multiple users
 * Permission: users.assign_role
 */
router.post(
  '/bulk',
  requirePermission('users.assign_role'),
  bulkAssignRole
);

/**
 * GET /api/tenant/dpf/user-roles/:userId
 * Get user's current role
 * Permission: users.view
 */
router.get(
  '/:userId',
  requirePermission('users.view'),
  getUserRole
);

/**
 * DELETE /api/tenant/dpf/user-roles/:userId
 * Remove role from user
 * Permission: users.assign_role
 */
router.delete(
  '/:userId',
  requirePermission('users.assign_role'),
  removeRole
);

/**
 * GET /api/tenant/dpf/user-roles/:userId/permissions
 * Get user's effective permissions (via role)
 * Permission: users.view
 */
router.get(
  '/:userId/permissions',
  requirePermission('users.view'),
  getUserPermissions
);

/**
 * GET /api/tenant/dpf/roles/:roleId/users
 * Get users with a specific role
 * Permission: users.view
 */
router.get(
  '/roles/:roleId/users',
  requirePermission('users.view'),
  getUsersWithRole
);

export default router;
