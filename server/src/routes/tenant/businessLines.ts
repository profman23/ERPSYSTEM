/**
 * BusinessLine Routes (BaseController pattern)
 *
 * Endpoints:
 *   GET    /api/v1/tenant/business-lines           -> List (paginated, searchable)
 *   GET    /api/v1/tenant/business-lines/:id       -> Get by ID
 *   POST   /api/v1/tenant/business-lines           -> Create
 *   PUT    /api/v1/tenant/business-lines/:id       -> Update
 *   DELETE /api/v1/tenant/business-lines/:id       -> Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { BusinessLineService } from '../../services/BusinessLineService';
import {
  createBusinessLineSchema,
  updateBusinessLineSchema,
  listBusinessLineSchema,
} from '../../validations/businessLineValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listBusinessLineSchema.parse(query);
    return BusinessLineService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return BusinessLineService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return BusinessLineService.create(tenantId, validated);
    },
    { bodySchema: createBusinessLineSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return BusinessLineService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateBusinessLineSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await BusinessLineService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
