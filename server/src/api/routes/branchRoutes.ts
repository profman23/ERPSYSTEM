/**
 * Branch Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * ADMIN PANEL: Tenant admins and system admins can manage branches
 */

import { Router } from 'express';
import { 
  createBranch, 
  getAllBranches, 
  getBranchById,
  updateBranch,
  deleteBranch
} from '../controllers/branchController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

// All branch routes are admin panel (tenant + system scope)
router.post(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Create branch')),
  authMiddleware,
  enforceRouteMetadata(),
  createBranch
);

router.get(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Get all branches')),
  authMiddleware,
  enforceRouteMetadata(),
  getAllBranches
);

router.get(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Get branch by ID')),
  authMiddleware,
  enforceRouteMetadata(),
  getBranchById
);

router.put(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Update branch')),
  authMiddleware,
  enforceRouteMetadata(),
  updateBranch
);

router.delete(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Delete branch')),
  authMiddleware,
  enforceRouteMetadata(),
  deleteBranch
);

export default router;
