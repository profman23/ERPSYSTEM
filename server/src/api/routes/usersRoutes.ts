/**
 * Users Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * APP PANEL: All authenticated users can access user management
 * Note: Controllers enforce tenant/branch/business-line isolation
 */

import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, toggleUserStatus } from '../controllers/usersController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

// All user routes are app panel (all authenticated users)
router.get(
  '/',
  routeMetadata(RoutePatterns.appPanel('Get all users')),
  authMiddleware,
  enforceRouteMetadata(),
  getAllUsers
);

router.get(
  '/:id',
  routeMetadata(RoutePatterns.appPanel('Get user by ID')),
  authMiddleware,
  enforceRouteMetadata(),
  getUserById
);

router.patch(
  '/:id',
  routeMetadata(RoutePatterns.appPanel('Update user')),
  authMiddleware,
  enforceRouteMetadata(),
  updateUser
);

router.patch(
  '/:id/status',
  routeMetadata(RoutePatterns.appPanel('Toggle user status')),
  authMiddleware,
  enforceRouteMetadata(),
  toggleUserStatus
);

export default router;
