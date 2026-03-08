/**
 * Tenant Role Routes - /api/tenant/roles
 * All routes protected by authMiddleware + tenantLoader
 * Permission enforcement via requirePermission middleware
 *
 * NOTE: No DELETE route - system follows No Delete Policy
 */

import { Router } from 'express';
import { RoleController } from '../../controllers/roleController';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

// Generate unique role code - must be before /:id to avoid route conflict
router.get(
  '/generate-code',
  requirePermission('roles.create'),
  RoleController.generateCode
);

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

// =========================================================================
// SAP B1 Style Screen Authorization Routes
// =========================================================================

// Get role with its screen authorizations
router.get(
  '/:id/with-authorizations',
  requirePermission('roles.view'),
  RoleController.getWithAuthorizations
);

// Get role's screen authorizations only
router.get(
  '/:id/authorizations',
  requirePermission('roles.view'),
  RoleController.getAuthorizations
);

// Set role's screen authorizations (bulk update)
router.put(
  '/:id/authorizations',
  requirePermission('roles.update'),
  RoleController.setAuthorizations
);

// DELETE route removed - No Delete Policy
// Users can only deactivate roles, not delete them

export default router;
