/**
 * API Routes - HARDENED with Panel-Level Access Control
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * All routes are protected with:
 * 1. Authentication (authMiddleware)
 * 2. Tenant context loading (tenantLoader)
 * 3. Rate limiting
 * 4. Panel-level access control (panelGuard) for system/admin APIs
 */

import { Router } from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import businessLineRoutes from './businessLineRoutes';
import branchRoutes from './branchRoutes';
import branchCapacityRoutes from './branchCapacityRoutes';
import hierarchyRoutes from './hierarchyRoutes';
import usersRoutes from './usersRoutes';
import tenantAdminRoutes from '../../routes/tenant';
import { authMiddleware } from '../../middleware/authMiddleware';
import { tenantLoader } from '../../middleware/tenantLoader';
import { apiRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter';
import { panelGuard, requireSystemScope, autoPanelGuard } from '../../middleware/scopeGuard';

import {
  testConcurrentCodeGeneration,
  getCodeGenerationMetrics,
} from '../controllers/systemTenantController';

const router = Router();

// TEST ROUTES - No auth (for load testing only)
router.post('/tenants/test-concurrent', testConcurrentCodeGeneration);
router.get('/tenants/test-metrics', getCodeGenerationMetrics);

router.use('/auth', authRoutes);

router.use('/hierarchy', authMiddleware, autoPanelGuard(), tenantLoader, apiRateLimiter, hierarchyRoutes);

router.use('/tenants', authMiddleware, autoPanelGuard(), tenantLoader, requireSystemScope(), apiRateLimiter, strictRateLimiter, tenantRoutes);
router.use('/business-lines', authMiddleware, autoPanelGuard(), tenantLoader, panelGuard('admin'), apiRateLimiter, strictRateLimiter, businessLineRoutes);
router.use('/branches', authMiddleware, autoPanelGuard(), tenantLoader, panelGuard('admin'), apiRateLimiter, strictRateLimiter, branchRoutes);
router.use('/branch-capacity', authMiddleware, autoPanelGuard(), tenantLoader, panelGuard('admin'), apiRateLimiter, branchCapacityRoutes);

router.use('/tenant/users', authMiddleware, autoPanelGuard(), tenantLoader, panelGuard('admin'), apiRateLimiter, usersRoutes);

router.use('/tenant', authMiddleware, autoPanelGuard(), tenantLoader, panelGuard('admin'), apiRateLimiter, tenantAdminRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API - Multi-Tenant Hierarchy Foundation Complete' });
});

export default router;
