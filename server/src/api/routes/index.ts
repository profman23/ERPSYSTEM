/**
 * API Routes - HARDENED with Panel-Level Access Control
 * 
 * PHASE 3 HARDENED - Dec 2024
 * 
 * All routes are protected with:
 * 1. Authentication (authMiddleware)
 * 2. Tenant context loading (tenantLoader)
 * 3. Rate limiting
 * 4. Panel-level access control (panelGuard) for system/admin APIs
 */

import { Router } from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import businessLineRoutes from '../../routes/tenant/businessLines';
import branchRoutes from '../../routes/tenant/branches';
import branchCapacityRoutes from './branchCapacityRoutes';
import hierarchyRoutes from './hierarchyRoutes';
import usersRoutes from '../../routes/tenant/users';
import tenantAdminRoutes from '../../routes/tenant';
import testRoutes from '../../routes/testRoutes';
import systemUserRolesRoutes from './systemUserRolesRoutes';
import systemRoutes from '../../routes/system';
import bulkRoutes from './bulkRoutes';
import healthRoutes from './healthRoutes';
import { authMiddleware } from '../../middleware/authMiddleware';
import { tenantLoader } from '../../middleware/tenantLoader';
import { tenantStatusGuard } from '../../middleware/tenantStatusGuard';
import { apiRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter';
import { panelGuard, requireSystemScope, autoPanelGuard } from '../../middleware/scopeGuard';

import {
  testConcurrentCodeGeneration,
  getCodeGenerationMetrics,
} from '../controllers/systemTenantController';
import { getUserAllScreenAuthorizations } from '../../rbac/permissionMiddleware';
import { TenantContext } from '../../core/tenant/tenantContext';
import { db } from '../../db';
import { tenants, users } from '../../db/schemas';
import { eq } from 'drizzle-orm';

const router = Router();

// TEST ROUTES - No auth (for load testing only)
router.post('/tenants/test-concurrent', testConcurrentCodeGeneration);
router.get('/tenants/test-metrics', getCodeGenerationMetrics);

router.use('/auth', authRoutes);

router.use('/hierarchy', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, apiRateLimiter, hierarchyRoutes);

// =========================================================================
// SYSTEM PANEL ROUTES - /api/v1/system/*
// All system routes use SYSTEM_* screen codes for authorization
// Protected by: authMiddleware + tenantLoader + requireSystemScope + screen-level authorization
// Note: tenantLoader is required to initialize TenantContext for SYSTEM users (with tenantId=null)
// =========================================================================
router.use('/system', authMiddleware, tenantLoader, requireSystemScope(), apiRateLimiter, systemRoutes);

// Legacy System User Roles Routes (kept for backward compatibility)
// TODO: Remove after frontend migration to /system/users/:userId/roles
router.use('/system/user-roles', authMiddleware, tenantLoader, requireSystemScope(), apiRateLimiter, systemUserRolesRoutes);

// Legacy Tenants Routes (kept for backward compatibility)
// TODO: Remove after frontend migration to /system/tenants
router.use('/tenants', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, requireSystemScope(), apiRateLimiter, strictRateLimiter, tenantRoutes);
router.use('/business-lines', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, strictRateLimiter, businessLineRoutes);
router.use('/branches', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, strictRateLimiter, branchRoutes);
router.use('/branch-capacity', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, branchCapacityRoutes);

// =========================================================================
// SCREEN AUTHORIZATIONS - Accessible by ALL authenticated users (no panelGuard)
// This endpoint must be before admin-guarded /tenant routes so regular users can fetch permissions
// =========================================================================
router.get('/tenant/users/me/screen-authorizations', authMiddleware, tenantLoader, tenantStatusGuard, apiRateLimiter, async (req, res, next) => {
  try {
    const user = (req as any).user;
    const context = TenantContext.getContext();

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let targetTenantId: string | null = null;
    if (user.accessScope === 'system') {
      const systemTenant = await db.query.tenants.findFirst({
        where: eq(tenants.code, 'SYSTEM'),
      });
      targetTenantId = systemTenant?.id || null;
    } else if (context?.tenantId) {
      targetTenantId = context.tenantId;
    } else if (user.tenantId) {
      targetTenantId = user.tenantId;
    }

    if (!targetTenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    const authorizations = await getUserAllScreenAuthorizations(user.userId, targetTenantId);
    const screenCount = Object.keys(authorizations).length;
    if (screenCount === 0) {
      console.warn(`[ScreenAuth] ⚠️ EMPTY permissions for userId=${user.userId} tenantId=${targetTenantId} role=${user.role} scope=${user.accessScope}`);
    } else {
      console.log(`[ScreenAuth] ✅ userId=${user.userId} screens=${screenCount}:`, Object.keys(authorizations).join(','));
    }
    res.json({ success: true, data: authorizations });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// SELF PROFILE UPDATE - Accessible by ALL authenticated users (no panelGuard)
// Must be before admin-guarded /tenant/users routes
// =========================================================================
router.patch('/tenant/users/me', authMiddleware, tenantLoader, tenantStatusGuard, apiRateLimiter, async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const allowedFields = ['firstName', 'lastName', 'phone', 'avatarUrl'];
    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Merge preferences (deep merge top-level keys, e.g. { style: {...} })
    if (req.body.preferences !== undefined && typeof req.body.preferences === 'object') {
      const currentRow = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, user.userId));
      const existing = (currentRow[0]?.preferences as Record<string, unknown>) || {};
      updateData.preferences = { ...existing, ...req.body.preferences };
    }

    // Auto-compute combined name field
    if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
      const currentUser = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, user.userId));
      if (currentUser.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const first = updateData.firstName ?? currentUser[0].firstName ?? '';
      const last = updateData.lastName ?? currentUser[0].lastName ?? '';
      updateData.name = `${first} ${last}`.trim();
    }

    const result = await db.update(users).set(updateData).where(eq(users.id, user.userId)).returning({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      preferences: users.preferences,
    });

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

router.use('/tenant/users', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, usersRoutes);

router.use('/tenant', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, tenantAdminRoutes);

// =========================================================================
// BULK OPERATIONS ROUTES - High-performance batch operations
// Protected by: authMiddleware + tenantLoader + panelGuard('admin')
// Supports operations for 3000+ tenants
// =========================================================================
router.use('/bulk', authMiddleware, autoPanelGuard(), tenantLoader, tenantStatusGuard, panelGuard('admin'), apiRateLimiter, bulkRoutes);

// =========================================================================
// HEALTH CHECK ROUTES - No authentication required
// Used by load balancers, Kubernetes probes, and monitoring systems
// =========================================================================
router.use('/health', healthRoutes);

// Test API - بدون authentication للاختبار السريع
router.use('/test', testRoutes);

router.get('/', (req, res) => {
  res.json({
    message: 'API - Multi-Tenant Hierarchy Foundation Complete',
    version: '2.0.0',
    scalability: '3000+ tenants supported',
    features: [
      'Redis-backed rate limiting',
      'L1/L2/L3 tiered caching',
      'Bulk operations API',
      'Cursor-based pagination',
      'Real-time permission invalidation',
    ],
  });
});

export default router;
