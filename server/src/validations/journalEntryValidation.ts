/**
 * Journal Entry Validation Schemas
 *
 * Validates:
 *   - createJournalEntrySchema: POST body (header + lines array)
 *   - reverseJournalEntrySchema: PUT /:id/reverse body
 *   - listJournalEntrySchema: GET query params
 *
 * Golden rule enforced: SUM(debit) === SUM(credit)
 * Line rule enforced: each line has debit XOR credit > 0
 */

import { z } from 'zod';

// ─── Line Schema ─────────────────────────────────────────────────────────────

const journalEntryLineSchema = z.object({
  accountId: z.string().uuid('Account is required'),
  debit: z.number().min(0, 'Debit must be >= 0').default(0),
  credit: z.number().min(0, 'Credit must be >= 0').default(0),
  remarks: z.string().max(1000).optional(),
  remarksAr: z.string().max(1000).optional(),
}).refine(
  (line) => (line.debit > 0 && line.credit === 0) || (line.credit > 0 && line.debit === 0),
  { message: 'Each line must have either debit or credit, not both and not zero' },
);

// ─── Create Schema ───────────────────────────────────────────────────────────

export const createJournalEntrySchema = z.object({
  branchId: z.string().uuid('Branch is required'),
  postingDate: z.string().min(1, 'Posting date is required'),
  documentDate: z.string().min(1, 'Document date is required'),
  dueDate: z.string().optional(),
  remarks: z.string().max(1000).optional(),
  remarksAr: z.string().max(1000).optional(),
  reference: z.string().max(255).optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'Minimum 2 lines required'),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
    // Use rounding to avoid floating point precision issues
    return Math.abs(totalDebit - totalCredit) < 0.0001;
  },
  { message: 'Total debit must equal total credit', path: ['lines'] },
);

// ─── Reverse Schema ──────────────────────────────────────────────────────────

export const reverseJournalEntrySchema = z.object({
  reversalDate: z.string().min(1, 'Reversal date is required'),
  remarks: z.string().max(1000).optional(),
  version: z.number().int().min(1, 'Version is required for optimistic locking'),
});

// ─── List Schema ─────────────────────────────────────────────────────────────

export const listJournalEntrySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['POSTED', 'REVERSED']).optional(),
  branchId: z.string().uuid().optional(),
  postingDateFrom: z.string().optional(),
  postingDateTo: z.string().optional(),
  sourceType: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type ReverseJournalEntryInput = z.infer<typeof reverseJournalEntrySchema>;
export type ListJournalEntryParams = z.infer<typeof listJournalEntrySchema>;
