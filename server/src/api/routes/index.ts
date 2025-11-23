import { Router } from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import businessLineRoutes from './businessLineRoutes';
import branchRoutes from './branchRoutes';
import branchCapacityRoutes from './branchCapacityRoutes';
import { authMiddleware } from '../../middleware/authMiddleware';
import { tenantLoader } from '../../middleware/tenantLoader';
import { apiRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public routes (auth)
router.use('/auth', authRoutes);

// Protected routes - require authentication + tenant context + rate limiting
router.use('/tenants', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, tenantRoutes);
router.use('/business-lines', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, businessLineRoutes);
router.use('/branches', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, branchRoutes);
router.use('/branch-capacity', authMiddleware, tenantLoader, apiRateLimiter, branchCapacityRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API - Enterprise Tenant Module - Phase 3 Complete' });
});

export default router;
