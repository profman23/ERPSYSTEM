import { Router } from 'express';
import { 
  createBusinessLine, 
  getAllBusinessLines, 
  getBusinessLineById,
  updateBusinessLine,
  deleteBusinessLine
} from '../controllers/businessLineController';

const router = Router();

router.post('/', createBusinessLine);
router.get('/', getAllBusinessLines);
router.get('/:id', getBusinessLineById);
router.put('/:id', updateBusinessLine);
router.delete('/:id', deleteBusinessLine);

export default router;
