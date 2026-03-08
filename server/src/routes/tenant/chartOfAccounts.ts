/**
 * Chart of Accounts Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/chart-of-accounts           → List (flat, paginated)
 *   GET    /api/v1/tenant/chart-of-accounts/tree       → Full tree structure
 *   GET    /api/v1/tenant/chart-of-accounts/postable   → Postable accounts (for dropdowns)
 *   GET    /api/v1/tenant/chart-of-accounts/:id        → Get by ID
 *   GET    /api/v1/tenant/chart-of-accounts/:id/ancestors → Breadcrumb trail
 *   POST   /api/v1/tenant/chart-of-accounts           → Create
 *   PUT    /api/v1/tenant/chart-of-accounts/:id        → Update
 *   PUT    /api/v1/tenant/chart-of-accounts/:id/move   → Re-parent
 *   DELETE /api/v1/tenant/chart-of-accounts/:id        → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { ChartOfAccountsService } from '../../services/ChartOfAccountsService';
import {
  createChartOfAccountSchema,
  updateChartOfAccountSchema,
  moveChartOfAccountSchema,
  listChartOfAccountsSchema,
} from '../../validations/chartOfAccountsValidation';

const router = Router();

// ─── LIST (flat, paginated) ──────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listChartOfAccountsSchema.parse(query);
    return ChartOfAccountsService.list(tenantId, params);
  }),
);

// ─── TREE (full hierarchy) ──────────────────────────────────────────────
router.get(
  '/tree',
  BaseController.handle(async ({ tenantId, query }) => {
    return ChartOfAccountsService.getTree(tenantId, {
      accountType: query.accountType as string | undefined,
      isActive: query.isActive as string | undefined,
    });
  }),
);

// ─── POSTABLE ACCOUNTS (for dropdowns) ──────────────────────────────────
router.get(
  '/postable',
  BaseController.handle(async ({ tenantId, query }) => {
    return ChartOfAccountsService.getPostableAccounts(
      tenantId,
      query.accountType as string | undefined,
    );
  }),
);

// ─── GET BY ID ──────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return ChartOfAccountsService.getById(tenantId, params.id);
  }),
);

// ─── ANCESTORS (breadcrumb trail) ───────────────────────────────────────
router.get(
  '/:id/ancestors',
  BaseController.handle(async ({ tenantId, params }) => {
    return ChartOfAccountsService.getAncestors(tenantId, params.id);
  }),
);

// ─── CREATE ─────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return ChartOfAccountsService.create(tenantId, validated);
    },
    { bodySchema: createChartOfAccountSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ─────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return ChartOfAccountsService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateChartOfAccountSchema },
  ),
);

// ─── MOVE (re-parent) ──────────────────────────────────────────────────
router.put(
  '/:id/move',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return ChartOfAccountsService.move(tenantId, params.id, validated.newParentId);
    },
    { bodySchema: moveChartOfAccountSchema },
  ),
);

// ─── DELETE (soft) ──────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await ChartOfAccountsService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
