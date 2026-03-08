/**
 * System Panel - Tenants Routes
 * All routes use SYSTEM_TENANT_LIST screen code for authorization
 *
 * Authorization Levels:
 * - 0: No Access
 * - 1: Read Only (view tenants list and details)
 * - 2: Full Access (view + create + update tenants)
 *
 * NOTE: No DELETE route - system follows No Delete Policy
 * Tenants can only be suspended/deactivated via PUT with { status: 'suspended' }
 */

import { Router } from 'express';
import { requireScreenAuth } from '../../rbac/permissionMiddleware';
import {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
} from '../../api/controllers/tenantController';
import {
  createTenantAdvanced,
  updateTenantAdvanced,
  generateTenantCode,
  getSubscriptionPlans,
  getCountries,
  getTenantDetails,
  listTenantsAdvanced,
} from '../../api/controllers/systemTenantController';

const router = Router();

// =========================================================================
// Meta Routes (must be before /:id to avoid route matching conflicts)
// =========================================================================

/**
 * GET /api/v1/system/tenants/meta/generate-code
 * Generate a unique tenant code
 */
router.get(
  '/meta/generate-code',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'write'),
  generateTenantCode
);

/**
 * GET /api/v1/system/tenants/meta/subscription-plans
 * Get available subscription plans
 */
router.get(
  '/meta/subscription-plans',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'read'),
  getSubscriptionPlans
);

/**
 * GET /api/v1/system/tenants/meta/countries
 * Get list of supported countries
 */
router.get(
  '/meta/countries',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'read'),
  getCountries
);

// =========================================================================
// Advanced Routes (must be before /:id)
// =========================================================================

/**
 * POST /api/v1/system/tenants/advanced
 * Create tenant with advanced setup (full wizard)
 */
router.post(
  '/advanced',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'write'),
  createTenantAdvanced
);

/**
 * PUT /api/v1/system/tenants/advanced/:id
 * Update tenant with advanced options
 */
router.put(
  '/advanced/:id',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'write'),
  updateTenantAdvanced
);

// =========================================================================
// Standard CRUD Routes
// =========================================================================

/**
 * GET /api/v1/system/tenants
 * List all tenants with pagination
 */
router.get(
  '/',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'read'),
  getAllTenants
);

/**
 * POST /api/v1/system/tenants
 * Create a new tenant (simple mode)
 */
router.post(
  '/',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'write'),
  createTenant
);

/**
 * GET /api/v1/system/tenants/:id
 * Get single tenant by ID
 */
router.get(
  '/:id',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'read'),
  getTenantById
);

/**
 * PUT /api/v1/system/tenants/:id
 * Update tenant
 */
router.put(
  '/:id',
  requireScreenAuth('SYSTEM_TENANT_LIST', 'write'),
  updateTenant
);

// DELETE route intentionally omitted - No Delete Policy
// Use PUT /:id with { status: 'suspended' } to deactivate tenants

export default router;
