/**
 * Auth Routes - HARDENED with Declarative Metadata
 * Phase 5 Backend Hardening
 * 
 * PUBLIC ROUTES: Login, token refresh, and logout
 * No authentication required (except logout)
 */

import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { authRateLimiter, tokenRefreshRateLimiter } from '../../middleware/rateLimiter';
import { routeMetadata, RoutePatterns, enforceRouteMetadata } from '../../middleware/routeMetadata';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user with tenantCode, email, password
 * Rate limited: 5 attempts per 15 minutes
 */
router.post(
  '/login',
  routeMetadata(RoutePatterns.publicRoute('User login')),
  authRateLimiter,
  enforceRouteMetadata(),
  login
);

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 * Rate limited: 10 refreshes per 5 minutes
 */
router.post(
  '/refresh',
  routeMetadata(RoutePatterns.publicRoute('Refresh access token')),
  tokenRefreshRateLimiter,
  enforceRouteMetadata(),
  refresh
);

/**
 * POST /auth/logout
 * Invalidate refresh token
 * REQUIRES AUTHENTICATION (cannot logout without being logged in)
 */
router.post(
  '/logout',
  routeMetadata({
    panel: 'public',
    requireAuth: true, // CRITICAL: Logout requires authentication
    description: 'User logout',
  }),
  authMiddleware,
  enforceRouteMetadata(),
  logout
);

export default router;
