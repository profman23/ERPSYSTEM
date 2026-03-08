/**
 * Tenant Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * CRITICAL: All tenant routes are SYSTEM PANEL only
 * Only system administrators can manage tenants
 */

import { Router } from 'express';
import {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  // deleteTenant removed - No Delete Policy
} from '../controllers/tenantController';
import {
  createTenantAdvanced,
  updateTenantAdvanced,
  generateTenantCode,
  getSubscriptionPlans,
  getCountries,
  getTenantDetails,
  listTenantsAdvanced,
  testConcurrentCodeGeneration,
  getCodeGenerationMetrics,
} from '../controllers/systemTenantController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';
import { requirePermission } from '../../rbac/permissionMiddleware';

const router = Router();

router.post(
  '/test-concurrent',
  testConcurrentCodeGeneration
);

router.get(
  '/test-metrics',
  getCodeGenerationMetrics
);

// Meta routes MUST be registered BEFORE /:id routes to avoid route matching conflicts
router.get(
  '/meta/generate-code',
  routeMetadata(RoutePatterns.systemOnly('Generate tenant code')),
  authMiddleware,
  enforceRouteMetadata(),
  generateTenantCode
);

router.get(
  '/meta/subscription-plans',
  routeMetadata(RoutePatterns.systemOnly('Get subscription plans')),
  authMiddleware,
  enforceRouteMetadata(),
  getSubscriptionPlans
);

router.get(
  '/meta/countries',
  routeMetadata(RoutePatterns.systemOnly('Get countries list')),
  authMiddleware,
  enforceRouteMetadata(),
  getCountries
);

// Advanced routes MUST be before /:id routes
router.post(
  '/advanced',
  routeMetadata(RoutePatterns.systemOnly('Create tenant with advanced setup')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.create'),
  createTenantAdvanced
);

router.put(
  '/advanced/:id',
  routeMetadata(RoutePatterns.systemOnly('Update tenant with advanced options')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.update'),
  updateTenantAdvanced
);

// All tenant management routes require system scope + DPF permission check
router.post(
  '/',
  routeMetadata(RoutePatterns.systemOnly('Create tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.create'),
  createTenant
);

router.get(
  '/',
  routeMetadata(RoutePatterns.systemOnly('Get all tenants')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.view'),
  getAllTenants
);

// IMPORTANT: /:id routes must come AFTER /meta/* and /advanced/* routes
router.get(
  '/:id',
  routeMetadata(RoutePatterns.systemOnly('Get tenant by ID')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.view'),
  getTenantById
);

router.put(
  '/:id',
  routeMetadata(RoutePatterns.systemOnly('Update tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  requirePermission('tenants.update'),
  updateTenant
);

// DELETE route removed - No Delete Policy
// Tenants can only be deactivated/suspended, not permanently deleted
// Use PUT /:id with { isActive: false } or system.tenants.suspend action

export default router;
