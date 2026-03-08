/**
 * Tax Codes Routes
 *
 * Follows species.ts route pattern.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/tax-codes           → List (paginated, searchable, filterable)
 *   GET    /api/v1/tenant/tax-codes/active    → Active tax codes for dropdowns (before /:id)
 *   GET    /api/v1/tenant/tax-codes/:id       → Get by ID
 *   POST   /api/v1/tenant/tax-codes           → Create
 *   PUT    /api/v1/tenant/tax-codes/:id       → Update
 *   DELETE /api/v1/tenant/tax-codes/:id       → Soft delete
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { TaxCodeService } from '../../services/TaxCodeService';
import {
  createTaxCodeSchema,
  updateTaxCodeSchema,
  listTaxCodesSchema,
} from '../../validations/taxCodeValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listTaxCodesSchema.parse(query);
    return TaxCodeService.list(tenantId, params);
  }),
);

// ─── ACTIVE (for dropdowns — must be before /:id) ───────────────────────────
router.get(
  '/active',
  BaseController.handle(async ({ tenantId, query }) => {
    const taxType = typeof query.taxType === 'string' ? query.taxType : undefined;
    return TaxCodeService.getActiveTaxCodes(tenantId, taxType);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return TaxCodeService.getById(tenantId, params.id);
  }),
);

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, validated }) => {
      return TaxCodeService.create(tenantId, validated);
    },
    { bodySchema: createTaxCodeSchema, statusCode: 201 },
  ),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return TaxCodeService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateTaxCodeSchema },
  ),
);

// ─── DELETE (soft) ───────────────────────────────────────────────────────────
router.delete(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params }) => {
      await TaxCodeService.remove(tenantId, params.id);
      return null;
    },
    { statusCode: 204 },
  ),
);

export default router;
