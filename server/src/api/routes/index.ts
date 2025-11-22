import { Router } from 'express';
import tenantRoutes from './tenantRoutes';
import businessLineRoutes from './businessLineRoutes';
import branchRoutes from './branchRoutes';
import branchCapacityRoutes from './branchCapacityRoutes';

const router = Router();

router.use('/tenants', tenantRoutes);
router.use('/business-lines', businessLineRoutes);
router.use('/branches', branchRoutes);
router.use('/branch-capacity', branchCapacityRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API - Enterprise Tenant Module' });
});

export default router;
