import { Router } from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import businessLineRoutes from './businessLineRoutes';
import branchRoutes from './branchRoutes';
import branchCapacityRoutes from './branchCapacityRoutes';
import hierarchyRoutes from './hierarchyRoutes';
import tenantAdminRoutes from '../../routes/tenant';
import { authMiddleware } from '../../middleware/authMiddleware';
import { tenantLoader } from '../../middleware/tenantLoader';
import { apiRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use('/auth', authRoutes);

router.use('/hierarchy', hierarchyRoutes);

router.use('/tenants', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, tenantRoutes);
router.use('/business-lines', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, businessLineRoutes);
router.use('/branches', authMiddleware, tenantLoader, apiRateLimiter, strictRateLimiter, branchRoutes);
router.use('/branch-capacity', authMiddleware, tenantLoader, apiRateLimiter, branchCapacityRoutes);

router.use('/tenant', authMiddleware, tenantLoader, apiRateLimiter, tenantAdminRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API - Multi-Tenant Hierarchy Foundation Complete' });
});

export default router;
