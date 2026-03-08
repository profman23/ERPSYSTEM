/**
 * System Panel - DPF (Dynamic Permission Fabric) Routes
 * Routes for managing DPF modules, screens, and permissions at the SYSTEM level
 *
 * Screen Codes:
 * - SYSTEM_DPF_MANAGER: For managing DPF structure (modules, screens)
 * - SYSTEM_ROLE_LIST: For permission matrix (used in role creation/editing)
 *
 * Authorization Levels:
 * - 0: No Access
 * - 1: Read Only (view modules, screens, permission matrix)
 * - 2: Full Access (view + manage)
 */

import { Router } from 'express';
import { requireScreenAuth } from '../../rbac/permissionMiddleware';
import {
  listModules,
  getModuleTree,
  getModuleById,
  getModuleWithStats,
} from '../../controllers/dpfModuleController';
import {
  listScreens,
  getScreenById,
  getScreenWithStats,
} from '../../controllers/dpfScreenController';
import {
  getPermissionMatrix,
  getAllPermissions,
  listPermissions,
  getPermissionById,
  getRolePermissions,
  assignPermissionsToRole,
} from '../../controllers/dpfPermissionController';

const router = Router();

// =========================================================================
// DPF Modules Routes (for viewing/managing system modules)
// =========================================================================

/**
 * GET /api/v1/system/dpf/modules
 * List all DPF modules (SYSTEM-level modules)
 */
router.get(
  '/modules',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  listModules
);

/**
 * GET /api/v1/system/dpf/modules/tree
 * Get module tree with screens — single JOIN, cached
 * Used by ScreenAuthorizationGrid (Single Source of Truth)
 */
router.get(
  '/modules/tree',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  getModuleTree
);

/**
 * GET /api/v1/system/dpf/modules/:id
 * Get module by ID
 */
router.get(
  '/modules/:id',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  getModuleById
);

/**
 * GET /api/v1/system/dpf/modules/:id/stats
 * Get module with statistics
 */
router.get(
  '/modules/:id/stats',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  getModuleWithStats
);

// =========================================================================
// DPF Screens Routes (for viewing/managing system screens)
// =========================================================================

/**
 * GET /api/v1/system/dpf/screens
 * List all DPF screens (SYSTEM-level screens)
 */
router.get(
  '/screens',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  listScreens
);

/**
 * GET /api/v1/system/dpf/screens/:id
 * Get screen by ID
 */
router.get(
  '/screens/:id',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  getScreenById
);

/**
 * GET /api/v1/system/dpf/screens/:id/stats
 * Get screen with statistics
 */
router.get(
  '/screens/:id/stats',
  requireScreenAuth('SYSTEM_DPF_MANAGER', 'read'),
  getScreenWithStats
);

// =========================================================================
// Permission Routes (for role permission management)
// These use SYSTEM_ROLE_LIST because they're used when creating/editing roles
// =========================================================================

/**
 * GET /api/v1/system/dpf/permissions/matrix
 * Get permission matrix (hierarchical: modules -> screens)
 * Used for role creation/editing forms
 */
router.get(
  '/permissions/matrix',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  getPermissionMatrix
);

/**
 * GET /api/v1/system/dpf/permissions/all
 * Get all permissions (flat list)
 */
router.get(
  '/permissions/all',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  getAllPermissions
);

/**
 * GET /api/v1/system/dpf/permissions
 * List permissions with pagination
 */
router.get(
  '/permissions',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  listPermissions
);

/**
 * GET /api/v1/system/dpf/permissions/:id
 * Get permission by ID
 */
router.get(
  '/permissions/:id',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  getPermissionById
);

/**
 * GET /api/v1/system/dpf/permissions/roles/:roleId/permissions
 * Get permissions assigned to a role
 */
router.get(
  '/permissions/roles/:roleId/permissions',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  getRolePermissions
);

/**
 * POST /api/v1/system/dpf/permissions/roles/:roleId/permissions
 * Assign permissions to a role
 */
router.post(
  '/permissions/roles/:roleId/permissions',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'write'),
  assignPermissionsToRole
);

export default router;
