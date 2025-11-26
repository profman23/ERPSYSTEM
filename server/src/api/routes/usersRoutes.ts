import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, toggleUserStatus } from '../controllers/usersController';

const router = Router();

router.get('/', getAllUsers);

router.get('/:id', getUserById);

router.patch('/:id', updateUser);

router.patch('/:id/status', toggleUserStatus);

export default router;
