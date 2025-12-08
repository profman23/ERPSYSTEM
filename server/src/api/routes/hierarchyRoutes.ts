/**
 * Hierarchy Routes
 * API routes for multi-tenant hierarchy management
 * Includes system user and tenant admin creation
 */

import { Router } from 'express';
import { hierarchyController } from '../controllers/hierarchyController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { requireSystemScope, panelGuard } from '../../middleware/scopeGuard';

const router = Router();

// CRITICAL: All routes explicitly include authMiddleware for defense-in-depth
// Never rely on parent router mounting for security-critical middleware

// System-only routes (System Panel)
// Auth → RequireSystemScope → Controller
router.post('/tenants', authMiddleware, requireSystemScope(), hierarchyController.createTenant);
router.post('/system-users', authMiddleware, requireSystemScope(), hierarchyController.createSystemUser);
router.post('/tenant-admins', authMiddleware, requireSystemScope(), hierarchyController.createTenantAdmin);
router.get('/system-user-roles', authMiddleware, requireSystemScope(), hierarchyController.getSystemUserRoles);

// Admin panel routes (Tenant Admin + System)
// Auth → PanelGuard('admin') → Controller
router.post('/business-lines', authMiddleware, panelGuard('admin'), hierarchyController.createBusinessLine);
router.post('/branches', authMiddleware, panelGuard('admin'), hierarchyController.createBranch);
router.get('/tenants/:tenantId/hierarchy', authMiddleware, panelGuard('admin'), hierarchyController.getTenantHierarchy);

// App panel routes (All authenticated users)
// Auth → Controller (autoPanelGuard at parent level handles app panel check)
router.post('/users', authMiddleware, hierarchyController.createUser);
router.get('/users/:userId/context', authMiddleware, hierarchyController.getUserContext);
router.get('/users/:userId/scope', authMiddleware, hierarchyController.getUserScope);

export default router;
