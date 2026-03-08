/**
 * Document Number Series Routes
 *
 * Follows taxCodes.ts route pattern.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/document-number-series       → List (paginated, filterable)
 *   GET    /api/v1/tenant/document-number-series/:id   → Get by ID
 *   PUT    /api/v1/tenant/document-number-series/:id   → Update (admin adjustments)
 *
 * No POST (auto-seeded on branch creation) or DELETE (never delete numbering series).
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { DocumentNumberSeriesService } from '../../services/DocumentNumberSeriesService';
import {
  listDocumentNumberSeriesSchema,
  updateDocumentNumberSeriesSchema,
} from '../../validations/documentNumberSeriesValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listDocumentNumberSeriesSchema.parse(query);
    return DocumentNumberSeriesService.list(tenantId, params);
  }),
);

// ─── GET BY ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return DocumentNumberSeriesService.getById(tenantId, params.id);
  }),
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  BaseController.handle(
    async ({ tenantId, params, validated }) => {
      return DocumentNumberSeriesService.update(tenantId, params.id, validated);
    },
    { bodySchema: updateDocumentNumberSeriesSchema },
  ),
);

export default router;
