import { Router } from 'express';
import { createTenant, getAllTenants, getTenantById } from '../controllers/tenantController';

const router = Router();

router.post('/', createTenant);
router.get('/', getAllTenants);
router.get('/:id', getTenantById);

export default router;
