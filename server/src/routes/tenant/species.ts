/**
 * Species Routes (Reference Feature Template)
 *
 * COPY THIS FILE for any new domain entity routes.
 * Pattern:
 *   - Router with CRUD endpoints
 *   - Each handler uses BaseController.handle() or handlePaginated()
 *   - Validation via bodySchema option (Zod auto-validated before handler runs)
 *   - Service handles all business logic (controller just delegates)
 *
 * Endpoints:
 *   GET    /api/v1/tenant/species           → List (paginated, searchable)
 *   GET    /api/v1/tenant/species/:id       → Get by ID
 *   POST   /api/v1/tenant/species           → Create
 *   PUT    /api/v1/tenant/species/:id       → Update
 *   DELETE /api/v1/tenant/species/:id       → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { SpeciesService } from '../../services/SpeciesService';
import {
  createSpeciesSchema,
  updateSpeciesSchema,
  listSpeciesSchema,
} from '../../validations/speciesValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listSpeciesSchema.parse(query);
    return SpeciesService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return SpeciesService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return SpeciesService.create(tenantId, validated);
    },
    { bodySchema: createSpeciesSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return SpeciesService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateSpeciesSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await SpeciesService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
