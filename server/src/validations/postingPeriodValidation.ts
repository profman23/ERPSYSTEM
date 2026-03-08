import { z } from 'zod';

/**
 * Posting Period Validation Schemas
 * SAP B1 Fiscal Year / Posting Period pattern.
 */

// ─── Create Fiscal Year ───────────────────────────────────────────────────────

export const createPostingPeriodSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2000, 'Fiscal year must be 2000 or later').max(9999),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine(
  (data) => data.endDate > data.startDate,
  { path: ['endDate'], message: 'End date must be after start date' },
);

export type CreatePostingPeriodInput = z.infer<typeof createPostingPeriodSchema>;

// ─── Update Sub-Period (status toggle / enable-disable) ───────────────────────

export const updateSubPeriodSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).optional(),
  isActive: z.boolean().optional(),
  version: z.coerce.number().int().min(1, 'Version is required'),
});

export type UpdateSubPeriodInput = z.infer<typeof updateSubPeriodSchema>;

// ─── List Fiscal Years ────────────────────────────────────────────────────────

export const listPostingPeriodSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  fiscalYear: z.coerce.number().int().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type ListPostingPeriodInput = z.infer<typeof listPostingPeriodSchema>;

// ─── List Sub-Periods ─────────────────────────────────────────────────────────

export const listSubPeriodsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSubPeriodsInput = z.infer<typeof listSubPeriodsSchema>;
