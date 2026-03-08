/**
 * System Panel - Users Routes
 * All routes use SYSTEM_USER_LIST screen code for authorization
 *
 * Authorization Levels:
 * - 0: No Access
 * - 1: Read Only (view users list)
 * - 2: Full Access (view + create + update + manage roles)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireScreenAuth } from '../../rbac/permissionMiddleware';
import { getAllUsers, getUserById, updateUser, toggleUserStatus } from '../../api/controllers/usersController';
import {
  assignRole,
  removeRole,
  getUserRole,
  listUsersWithRoles,
} from '../../controllers/dpfUserRoleController';
import { SystemUserService } from '../../services/SystemUserService';

const router = Router();

// =========================================================================
// System Users CRUD Routes
// =========================================================================

/**
 * GET /api/v1/system/users
 * List all system users (accessScope = 'system')
 */
router.get(
  '/',
  requireScreenAuth('SYSTEM_USER_LIST', 'read'),
  getAllUsers
);

/**
 * GET /api/v1/system/users/:id
 * Get single system user by ID
 */
router.get(
  '/:id',
  requireScreenAuth('SYSTEM_USER_LIST', 'read'),
  getUserById
);

/**
 * POST /api/v1/system/users
 * Create a new system user
 */
router.post(
  '/',
  requireScreenAuth('SYSTEM_USER_LIST', 'write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userType, ...userData } = req.body;

      if (userType === 'system') {
        const user = await SystemUserService.createSystemUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          roleId: userData.roleId,
          roleCode: userData.roleCode,
        });
        res.status(201).json({ success: true, data: user });
      } else if (userType === 'tenant_admin') {
        const user = await SystemUserService.createTenantAdmin({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          tenantId: userData.tenantId,
        });
        res.status(201).json({ success: true, data: user });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid userType. Must be "system" or "tenant_admin"',
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        next(error);
      }
    }
  }
);

/**
 * PATCH /api/v1/system/users/:id
 * Update system user
 */
router.patch(
  '/:id',
  requireScreenAuth('SYSTEM_USER_LIST', 'write'),
  updateUser
);

/**
 * PATCH /api/v1/system/users/:id/status
 * Toggle user active status
 */
router.patch(
  '/:id/status',
  requireScreenAuth('SYSTEM_USER_LIST', 'write'),
  toggleUserStatus
);

// =========================================================================
// System User Role Management Routes
// =========================================================================

/**
 * GET /api/v1/system/users/with-roles
 * List system users with their roles (for role management page)
 * Must be before /:id route to avoid conflict
 */
router.get(
  '/with-roles',
  requireScreenAuth('SYSTEM_USER_LIST', 'read'),
  listUsersWithRoles
);

/**
 * GET /api/v1/system/users/:userId/roles
 * Get user's current role assignment
 */
router.get(
  '/:userId/roles',
  requireScreenAuth('SYSTEM_USER_LIST', 'read'),
  getUserRole
);

/**
 * POST /api/v1/system/users/:userId/roles
 * Assign role to user
 */
router.post(
  '/:userId/roles',
  requireScreenAuth('SYSTEM_USER_LIST', 'write'),
  async (req: Request, res: Response, next: NextFunction) => {
    // Merge userId from params into body for the controller
    req.body.userId = req.params.userId;
    return assignRole(req, res, next);
  }
);

/**
 * DELETE /api/v1/system/users/:userId/roles
 * Remove role from user
 */
router.delete(
  '/:userId/roles',
  requireScreenAuth('SYSTEM_USER_LIST', 'write'),
  removeRole
);

// NOTE: No DELETE user route - system follows No Delete Policy
// Users can only be deactivated via PATCH with { isActive: false }

export default router;
