import { Router } from 'express';
import { createBranchCapacity, getAllBranchCapacities } from '../controllers/branchCapacityController';

const router = Router();

router.post('/', createBranchCapacity);
router.get('/', getAllBranchCapacities);

export default router;
