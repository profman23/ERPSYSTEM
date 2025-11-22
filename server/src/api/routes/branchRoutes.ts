import { Router } from 'express';
import { createBranch, getAllBranches, getBranchById } from '../controllers/branchController';

const router = Router();

router.post('/', createBranch);
router.get('/', getAllBranches);
router.get('/:id', getBranchById);

export default router;
