import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user with tenantCode, email, password
 */
router.post('/login', login);

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', refresh);

/**
 * POST /auth/logout
 * Invalidate refresh token
 */
router.post('/logout', logout);

export default router;
