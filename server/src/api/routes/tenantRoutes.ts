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
  deleteTenant 
} from '../controllers/tenantController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

// All tenant management routes require system scope
router.post(
  '/',
  routeMetadata(RoutePatterns.systemOnly('Create tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  createTenant
);

router.get(
  '/',
  routeMetadata(RoutePatterns.systemOnly('Get all tenants')),
  authMiddleware,
  enforceRouteMetadata(),
  getAllTenants
);

router.get(
  '/:id',
  routeMetadata(RoutePatterns.systemOnly('Get tenant by ID')),
  authMiddleware,
  enforceRouteMetadata(),
  getTenantById
);

router.put(
  '/:id',
  routeMetadata(RoutePatterns.systemOnly('Update tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  updateTenant
);

router.delete(
  '/:id',
  routeMetadata(RoutePatterns.systemOnly('Delete tenant')),
  authMiddleware,
  enforceRouteMetadata(),
  deleteTenant
);

export default router;
