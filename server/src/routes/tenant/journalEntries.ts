/**
 * Journal Entry Routes
 *
 * Document Immutability: No PUT (update) endpoint — entries are immutable after save.
 * Corrections are done through reversal only.
 *
 * Endpoints:
 *   GET    /api/v1/tenant/journal-entries           → List (paginated, filtered)
 *   GET    /api/v1/tenant/journal-entries/:id       → Get by ID (with lines + account info)
 *   POST   /api/v1/tenant/journal-entries           → Create (save = POSTED, immutable)
 *   PUT    /api/v1/tenant/journal-entries/:id/reverse → Reverse a POSTED entry
 */

import { Router } from 'express';
import { BaseController } from '../../core/controller';
import { JournalEntryService } from '../../services/JournalEntryService';
import {
  createJournalEntrySchema,
  reverseJournalEntrySchema,
  listJournalEntrySchema,
} from '../../validations/journalEntryValidation';

const router = Router();

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  BaseController.handlePaginated(async ({ tenantId, query }) => {
    const params = listJournalEntrySchema.parse(query);
    return JournalEntryService.list(tenantId, params);
  }),
);

// ─── GET BY ID (with lines) ─────────────────────────────────────────────────
router.get(
  '/:id',
  BaseController.handle(async ({ tenantId, params }) => {
    return JournalEntryService.getById(tenantId, params.id);
  }),
);

// ─── CREATE (save = POSTED, immutable) ──────────────────────────────────────
router.post(
  '/',
  BaseController.handle(
    async ({ tenantId, userId, validated }) => {
      return JournalEntryService.create(tenantId, userId, validated);
    },
    { bodySchema: createJournalEntrySchema, statusCode: 201 },
  ),
);

// ─── REVERSE (POSTED → REVERSED + create new reversal entry) ────────────────
router.put(
  '/:id/reverse',
  BaseController.handle(
    async ({ tenantId, userId, params, validated }) => {
      return JournalEntryService.reverse(tenantId, userId, params.id, validated);
    },
    { bodySchema: reverseJournalEntrySchema },
  ),
);

// NO PUT /:id (update) — Document Immutability Rule: entries cannot be edited after save
// NO DELETE /:id — Documents are NEVER deleted

export default router;
