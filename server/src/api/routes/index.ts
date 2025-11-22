import { Router } from 'express';
import tenantRoutes from './tenantRoutes';

const router = Router();

router.use('/tenants', tenantRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'API - Phase 1 Foundation' });
});

export default router;
