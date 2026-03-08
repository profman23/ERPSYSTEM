/**
 * Unit of Measure Routes
 *
 * Follows taxCodes.ts route pattern.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/units-of-measure           → List (paginated, searchable)
 *   GET    /api/v1/tenant/units-of-measure/:id       → Get by ID
 *   POST   /api/v1/tenant/units-of-measure           → Create
 *   PUT    /api/v1/tenant/units-of-measure/:id       → Update (with optimistic locking)
 *   DELETE /api/v1/tenant/units-of-measure/:id       → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { UnitOfMeasureService } from '../../services/UnitOfMeasureService';
import {
  createUnitOfMeasureSchema,
  updateUnitOfMeasureSchema,
  listUnitOfMeasuresSchema,
} from '../../validations/unitOfMeasureValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listUnitOfMeasuresSchema.parse(query);
    return UnitOfMeasureService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return UnitOfMeasureService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return UnitOfMeasureService.create(tenantId, validated);
    },
    { bodySchema: createUnitOfMeasureSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return UnitOfMeasureService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateUnitOfMeasureSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await UnitOfMeasureService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
