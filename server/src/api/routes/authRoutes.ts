import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authRateLimiter, tokenRefreshRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user with tenantCode, email, password
 * Rate limited: 5 attempts per 15 minutes
 */
router.post('/login', authRateLimiter, login);

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 * Rate limited: 10 refreshes per 5 minutes
 */
router.post('/refresh', tokenRefreshRateLimiter, refresh);

/**
 * POST /auth/logout
 * Invalidate refresh token
 */
router.post('/logout', logout);

export default router;
