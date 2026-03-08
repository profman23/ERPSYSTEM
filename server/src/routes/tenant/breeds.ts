/**
 * Breeds Routes
 *
 * Endpoints:
 *   GET    /api/v1/tenant/breeds           → List (paginated, searchable, speciesId filter)
 *   GET    /api/v1/tenant/breeds/:id       → Get by ID
 *   POST   /api/v1/tenant/breeds           → Create
 *   PUT    /api/v1/tenant/breeds/:id       → Update
 *   DELETE /api/v1/tenant/breeds/:id       → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { BreedService } from '../../services/BreedService';
import {
  createBreedSchema,
  updateBreedSchema,
  listBreedsSchema,
} from '../../validations/breedValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listBreedsSchema.parse(query);
    return BreedService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return BreedService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return BreedService.create(tenantId, validated);
    },
    { bodySchema: createBreedSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return BreedService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateBreedSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await BreedService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
