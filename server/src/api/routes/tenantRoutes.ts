import { Router } from 'express';
import { TenantController } from '../controllers/TenantController';

const router = Router();
const tenantController = new TenantController();

router.get('/', tenantController.getAll);
router.get('/:id', tenantController.getById);

export default router;
