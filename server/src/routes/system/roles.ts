/**
 * System Panel - Roles Routes
 * All routes use SYSTEM_ROLE_LIST screen code for authorization
 *
 * Authorization Levels:
 * - 0: No Access
 * - 1: Read Only (view)
 * - 2: Full Access (view + create + update + delete)
 */

import { Router } from 'express';
import { RoleController } from '../../controllers/roleController';
import { requireScreenAuth } from '../../rbac/permissionMiddleware';

const router = Router();

// Generate unique role code - must be before /:id to avoid route conflict
router.get(
  '/generate-code',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'write'),
  RoleController.generateCode
);

// List all system roles
router.get(
  '/',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  RoleController.list
);

// Get single role by ID
router.get(
  '/:id',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  RoleController.getById
);

// Create new system role
router.post(
  '/',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'write'),
  RoleController.create
);

// Update existing role
router.patch(
  '/:id',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'write'),
  RoleController.update
);

// =========================================================================
// SAP B1 Style Screen Authorization Routes
// =========================================================================

// Get role with its screen authorizations
router.get(
  '/:id/with-authorizations',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  RoleController.getWithAuthorizations
);

// Get role's screen authorizations only
router.get(
  '/:id/authorizations',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'read'),
  RoleController.getAuthorizations
);

// Set role's screen authorizations (bulk update)
router.put(
  '/:id/authorizations',
  requireScreenAuth('SYSTEM_ROLE_LIST', 'write'),
  RoleController.setAuthorizations
);

// NOTE: No DELETE route - system follows No Delete Policy
// Users can only deactivate roles via PATCH with { isActive: false }

export default router;
