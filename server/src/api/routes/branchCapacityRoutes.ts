/**
 * Branch Capacity Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * ADMIN PANEL: Tenant admins and system admins can manage branch capacity
 */

import { Router } from 'express';
import { createBranchCapacity, getAllBranchCapacities } from '../controllers/branchCapacityController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

// All branch capacity routes are admin panel (tenant + system scope)
router.post(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Create branch capacity')),
  authMiddleware,
  enforceRouteMetadata(),
  createBranchCapacity
);

router.get(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Get all branch capacities')),
  authMiddleware,
  enforceRouteMetadata(),
  getAllBranchCapacities
);

export default router;
