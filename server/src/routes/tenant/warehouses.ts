/**
 * Warehouse Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/warehouses                → List (paginated, searchable, filterable)
 *   GET    /api/v1/tenant/warehouses/:id            → Get by ID
 *   GET    /api/v1/tenant/warehouses/branch/:branchId → List by branch
 *   POST   /api/v1/tenant/warehouses                → Create
 *   PUT    /api/v1/tenant/warehouses/:id            → Update
 *   PATCH  /api/v1/tenant/warehouses/:id/status     → Toggle active status
 *   DELETE /api/v1/tenant/warehouses/:id            → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { WarehouseService } from '../../services/WarehouseService';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  listWarehouseSchema,
} from '../../validations/warehouseValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listWarehouseSchema.parse(query);
    return WarehouseService.list(tenantId, params);
  }),
);

// ─── LIST BY BRANCH ─────────────────────────────────────────────────────────
router.get(
  '/branch/:branchId',
  BaseController.handle(async ({ tenantId, params }) => {
    return WarehouseService.listByBranch(tenantId, params.branchId);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return WarehouseService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return WarehouseService.create(tenantId, validated);
    },
    { bodySchema: createWarehouseSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return WarehouseService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateWarehouseSchema },
  ),
);

// ─── TOGGLE STATUS ──────────────────────────────────────────────────────────
router.patch(
  '/:id/status',
  BaseController.handle(async ({ tenantId, params }) => {
    return WarehouseService.toggleStatus(tenantId, params.id);
  }),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await WarehouseService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
