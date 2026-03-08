/**
 * Branch Routes (BaseController pattern)
 *
 * Endpoints:
 *   GET    /api/v1/tenant/branches           -> List (paginated, searchable)
 *   GET    /api/v1/tenant/branches/:id       -> Get by ID
 *   POST   /api/v1/tenant/branches           -> Create
 *   PUT    /api/v1/tenant/branches/:id       -> Update
 *   DELETE /api/v1/tenant/branches/:id       -> Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { BranchService } from '../../services/BranchService';
import {
  createBranchSchema,
  updateBranchSchema,
  listBranchSchema,
} from '../../validations/branchValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listBranchSchema.parse(query);
    return BranchService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return BranchService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return BranchService.create(tenantId, validated);
    },
    { bodySchema: createBranchSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return BranchService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateBranchSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await BranchService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
