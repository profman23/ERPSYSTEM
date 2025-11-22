import { Router } from 'express';
import { createBusinessLine, getAllBusinessLines, getBusinessLineById } from '../controllers/businessLineController';

const router = Router();

router.post('/', createBusinessLine);
router.get('/', getAllBusinessLines);
router.get('/:id', getBusinessLineById);

export default router;
