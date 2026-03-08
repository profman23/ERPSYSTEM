/**
 * System User Roles Routes - /api/v1/system/user-roles
 * Routes for System Admin panel to manage user roles
 * Protected by authMiddleware + requireSystemScope()
 */

import { Router } from 'express';
import {
  assignRole,
  removeRole,
  getUserRole,
  listUsersWithRoles,
} from '../../controllers/dpfUserRoleController';

const router = Router();

/**
 * GET /api/v1/system/user-roles
 * List users with their roles (for system admin)
 */
router.get('/', listUsersWithRoles);

/**
 * GET /api/v1/system/user-roles/:userId
 * Get user's current role
 */
router.get('/:userId', getUserRole);

/**
 * POST /api/v1/system/user-roles
 * Assign role to user
 */
router.post('/', assignRole);

/**
 * DELETE /api/v1/system/user-roles/:userId
 * Remove role from user
 */
router.delete('/:userId', removeRole);

export default router;
