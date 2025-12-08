/**
 * Business Line Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * ADMIN PANEL: Tenant admins and system admins can manage business lines
 */

import { Router } from 'express';
import { 
  createBusinessLine, 
  getAllBusinessLines, 
  getBusinessLineById,
  updateBusinessLine,
  deleteBusinessLine
} from '../controllers/businessLineController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

// All business line routes are admin panel (tenant + system scope)
router.post(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Create business line')),
  authMiddleware,
  enforceRouteMetadata(),
  createBusinessLine
);

router.get(
  '/',
  routeMetadata(RoutePatterns.adminPanel('Get all business lines')),
  authMiddleware,
  enforceRouteMetadata(),
  getAllBusinessLines
);

router.get(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Get business line by ID')),
  authMiddleware,
  enforceRouteMetadata(),
  getBusinessLineById
);

router.put(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Update business line')),
  authMiddleware,
  enforceRouteMetadata(),
  updateBusinessLine
);

router.delete(
  '/:id',
  routeMetadata(RoutePatterns.adminPanel('Delete business line')),
  authMiddleware,
  enforceRouteMetadata(),
  deleteBusinessLine
);

export default router;
