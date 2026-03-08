/**
 * Tenant Routes Index - Mounts all tenant-scoped routes
 * Base path: /api/tenant
 * All routes automatically protected by authMiddleware + tenantLoader
 * Includes: Journal Entries (double-entry bookkeeping, immutable documents)
 */

import { Router } from 'express';
import rolesRouter from './roles';
import permissionsRouter from './permissions';
import rolePermissionsRouter from './rolePermissions';
import userRolesRouter from './userRoles';
import dpfModulesRouter from './dpfModules';
import dpfScreensRouter from './dpfScreens';
import dpfActionsRouter from './dpfActions';
import dpfPermissionsRouter from './dpfPermissions';
import dpfUserRolesRouter from './dpfUserRoles';
import dpfUserCustomPermissionsRouter from './dpfUserCustomPermissions';
import dpfUserRoleBranchesRouter from './dpfUserRoleBranches';
import aiRouter from './ai';
import branchesRouter from './branches';
import businessLinesRouter from './businessLines';
import usersRouter from './users';
import speciesRouter from './species';
import breedsRouter from './breeds';
import clientsRouter from './clients';
import patientsRouter from './patients';
import chartOfAccountsRouter from './chartOfAccounts';
import taxCodesRouter from './taxCodes';
import warehousesRouter from './warehouses';
import itemGroupsRouter from './itemGroups';
import unitOfMeasuresRouter from './unitOfMeasures';
import itemsRouter from './items';
import documentNumberSeriesRouter from './documentNumberSeries';
import postingPeriodsRouter from './postingPeriods';
import journalEntriesRouter from './journalEntries';
import { BaseController } from '../../core/controller';
import { UserRoleService } from '../../services/userRoleService';
import { requirePermission, getUserAllScreenAuthorizations } from '../../rbac/permissionMiddleware';
import { db } from '../../db';
import { tenants } from '../../db/schemas';
import { eq } from 'drizzle-orm';

const router = Router();

router.use('/roles', rolesRouter);

router.use('/roles/:id/permissions', rolePermissionsRouter);

router.use('/permissions', permissionsRouter);

router.use('/users/:id/role', userRolesRouter);

router.get(
  '/users/with-roles',
  requirePermission('users.view'),
  BaseController.handle(async ({ tenantId }) => {
    return UserRoleService.getUsersWithRoles(tenantId);
  }),
);

/**
 * GET /api/tenant/users/me/screen-authorizations
 * Get current user's screen authorization levels (SAP B1 style)
 * Returns: { screenCode: authorizationLevel (0/1/2) }
 */
router.get(
  '/users/me/screen-authorizations',
  BaseController.handle(async ({ tenantId, userId, isSystem }) => {
    // For SYSTEM users, resolve SYSTEM tenant
    let targetTenantId = tenantId;
    if (isSystem) {
      const systemTenant = await db.query.tenants.findFirst({
        where: eq(tenants.code, 'SYSTEM'),
      });
      if (systemTenant?.id) {
        targetTenantId = systemTenant.id;
      }
    }
    return getUserAllScreenAuthorizations(userId, targetTenantId);
  }),
);

// DPF Routes
router.use('/dpf/modules', dpfModulesRouter);
router.use('/dpf/screens', dpfScreensRouter);
router.use('/dpf/actions', dpfActionsRouter);
router.use('/dpf/permissions', dpfPermissionsRouter);
router.use('/dpf/user-roles', dpfUserRolesRouter);
router.use('/dpf/custom-permissions', dpfUserCustomPermissionsRouter);
router.use('/dpf/user-role-branches', dpfUserRoleBranchesRouter);

// AI Routes - Tenant-specific AI features
router.use('/ai', aiRouter);

// Core Entity Routes (BaseController pattern)
router.use('/branches', branchesRouter);
router.use('/business-lines', businessLinesRouter);
router.use('/users', usersRouter);

// Domain Routes (Veterinary)
router.use('/species', speciesRouter);
router.use('/breeds', breedsRouter);
router.use('/clients', clientsRouter);
router.use('/patients', patientsRouter);

// Financial Routes
router.use('/chart-of-accounts', chartOfAccountsRouter);
router.use('/tax-codes', taxCodesRouter);
router.use('/document-number-series', documentNumberSeriesRouter);
router.use('/posting-periods', postingPeriodsRouter);
router.use('/journal-entries', journalEntriesRouter);

// Inventory Routes
router.use('/warehouses', warehousesRouter);
router.use('/item-groups', itemGroupsRouter);
router.use('/units-of-measure', unitOfMeasuresRouter);
router.use('/items', itemsRouter);

export default router;
