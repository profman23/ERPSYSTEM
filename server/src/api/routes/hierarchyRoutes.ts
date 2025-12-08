/**
 * Hierarchy Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * EVERY ROUTE explicitly declares:
 * - Panel ownership (system/admin/app)
 * - Authentication requirement
 * - Required user scopes
 * 
 * NO implicit panel detection or pattern matching
 */

import { Router } from 'express';
import { hierarchyController } from '../controllers/hierarchyController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

/**
 * DECLARATIVE ROUTE METADATA PATTERN:
 * ====================================
 * 1. routeMetadata() - FIRST middleware, declares requirements
 * 2. authMiddleware - Authenticates user
 * 3. enforceRouteMetadata() - Validates user against metadata
 * 4. Controller - Business logic
 * 
 * This pattern replaces implicit autoPanelGuard with explicit declarations
 */

// ====================
// SYSTEM PANEL ROUTES
// ====================

router.post(
  '/tenants',
  routeMetadata(RoutePatterns.systemOnly('Create tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createTenant
);

router.post(
  '/system-users',
  routeMetadata(RoutePatterns.systemOnly('Create system user')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createSystemUser
);

router.post(
  '/tenant-admins',
  routeMetadata(RoutePatterns.systemOnly('Create tenant admin')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createTenantAdmin
);

router.get(
  '/system-user-roles',
  routeMetadata(RoutePatterns.systemOnly('Get system user roles')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.getSystemUserRoles
);

// ===================
// ADMIN PANEL ROUTES
// ===================

router.post(
  '/business-lines',
  routeMetadata(RoutePatterns.adminPanel('Create business line')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createBusinessLine
);

router.post(
  '/branches',
  routeMetadata(RoutePatterns.adminPanel('Create branch')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createBranch
);

router.get(
  '/tenants/:tenantId/hierarchy',
  routeMetadata(RoutePatterns.adminPanel('Get tenant hierarchy')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.getTenantHierarchy
);

// ================
// APP PANEL ROUTES
// ================

router.post(
  '/users',
  routeMetadata(RoutePatterns.appPanel('Create user')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.createUser
);

router.get(
  '/users/:userId/context',
  routeMetadata(RoutePatterns.appPanel('Get user context')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.getUserContext
);

router.get(
  '/users/:userId/scope',
  routeMetadata(RoutePatterns.appPanel('Get user scope')),
  authMiddleware,
  enforceRouteMetadata(),
  hierarchyController.getUserScope
);

export default router;
