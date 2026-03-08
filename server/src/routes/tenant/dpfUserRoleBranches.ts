/**
 * DPF User Role Branch Routes
 * Branch-level access control API endpoints
 *
 * Migrated to BaseController.handle() pattern.
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DPFUserRoleBranchService } from '../../services/dpfUserRoleBranchService';
import { requirePermission } from '../../rbac/permissionMiddleware';
import {
  assignBranchesSchema,
} from '../../validations/dpfUserRoleBranchValidation';

const router = Router();

// ─── ASSIGN BRANCHES ─────────────────────────────────────────────────────────
// POST /api/tenant/dpf/user-role-branches
router.post(
  '/',
  requirePermission('dpf.user_roles.manage_branches'),
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return DPFUserRoleBranchService.assignBranches(tenantId, validated);
    },
    { bodySchema: assignBranchesSchema },
  ),
);

// ─── GET USER BRANCHES ───────────────────────────────────────────────────────
// GET /api/tenant/dpf/user-role-branches/:userRoleId
router.get(
  '/:userRoleId',
  requirePermission('dpf.user_roles.view'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFUserRoleBranchService.getUserBranches(tenantId, params.userRoleId);
  }),
);

// ─── REMOVE SPECIFIC BRANCH ─────────────────────────────────────────────────
// DELETE /api/tenant/dpf/user-role-branches/:userRoleId/branch/:branchId
router.delete(
  '/:userRoleId/branch/:branchId',
  requirePermission('dpf.user_roles.manage_branches'),
  BaseController.handle(async ({ tenantId, params }) => {
    await DPFUserRoleBranchService.removeBranch(tenantId, params.userRoleId, params.branchId);
    return null;
  }),
);

// ─── REMOVE ALL BRANCHES ────────────────────────────────────────────────────
// DELETE /api/tenant/dpf/user-role-branches/:userRoleId
router.delete(
  '/:userRoleId',
  requirePermission('dpf.user_roles.manage_branches'),
  BaseController.handle(async ({ tenantId, params }) => {
    await DPFUserRoleBranchService.removeAllBranches(tenantId, params.userRoleId);
    return null;
  }),
);

// ─── GET USERS BY BRANCH ────────────────────────────────────────────────────
// GET /api/tenant/dpf/branches/:branchId/users
router.get(
  '/branches/:branchId/users',
  requirePermission('dpf.branches.view_users'),
  BaseController.handle(async ({ tenantId, params }) => {
    return DPFUserRoleBranchService.getUsersByBranch(tenantId, params.branchId);
  }),
);

export default router;
