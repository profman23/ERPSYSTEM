/**
 * Document Number Series Validation
 *
 * Only list + update schemas — no create schema (auto-seeded on branch creation).
 */

import { z } from 'zod';

// ─── LIST (GET query params) ─────────────────────────────────────────────────

export const listDocumentNumberSeriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  documentType: z.string().max(30).optional(),
});

export type ListDocumentNumberSeriesParams = z.infer<typeof listDocumentNumberSeriesSchema>;

// ─── UPDATE (PUT body) ──────────────────────────────────────────────────────

export const updateDocumentNumberSeriesSchema = z.object({
  prefix: z.string().max(10, 'Prefix must be 10 characters or less').optional(),
  separator: z.string().max(5, 'Separator must be 5 characters or less').optional(),
  nextNumber: z.number().int().min(1, 'Next number must be at least 1').optional(),
  padding: z.number().int().min(1, 'Padding must be at least 1').max(15, 'Padding must be 15 or less').optional(),
  // Optimistic locking — required on every update
  version: z.number().int().min(1, 'Version is required'),
});

export type UpdateDocumentNumberSeriesInput = z.infer<typeof updateDocumentNumberSeriesSchema>;
