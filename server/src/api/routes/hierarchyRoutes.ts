/**
 * Hierarchy Routes
 * API routes for multi-tenant hierarchy management
 */

import { Router } from 'express';
import { hierarchyController } from '../controllers/hierarchyController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

router.post('/tenants', hierarchyController.createTenant);

router.post('/business-lines', authMiddleware, hierarchyController.createBusinessLine);

router.post('/branches', authMiddleware, hierarchyController.createBranch);

router.post('/users', authMiddleware, hierarchyController.createUser);

router.get('/tenants/:tenantId/hierarchy', authMiddleware, hierarchyController.getTenantHierarchy);

router.get('/users/:userId/context', authMiddleware, hierarchyController.getUserContext);

router.get('/users/:userId/scope', authMiddleware, hierarchyController.getUserScope);

export default router;
