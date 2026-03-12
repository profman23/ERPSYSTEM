/**
 * GL Report Validation Schemas
 *
 * Trial Balance: fiscal year + period range + optional branch filter
 * Account Ledger: account ID + date range + optional branch + pagination
 */

import { z } from 'zod';

export const trialBalanceSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2000, 'Fiscal year must be 2000 or later').max(2100, 'Fiscal year must be 2100 or earlier'),
  periodFrom: z.coerce.number().int().min(1, 'Period must be between 1 and 12').max(12, 'Period must be between 1 and 12').optional().default(1),
  periodTo: z.coerce.number().int().min(1, 'Period must be between 1 and 12').max(12, 'Period must be between 1 and 12').optional().default(12),
  branchId: z.string().uuid('Invalid branch ID').optional(),
}).refine(
  (data) => data.periodFrom <= data.periodTo,
  { message: 'Period from must be less than or equal to period to', path: ['periodFrom'] },
);

export const accountLedgerSchema = z.object({
  accountId: z.string().uuid('Valid account ID is required'),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional().default(50),
}).refine(
  (data) => data.dateFrom <= data.dateTo,
  { message: 'Date from must be before or equal to date to', path: ['dateFrom'] },
);

export const accountBalanceParamsSchema = z.object({
  fiscalYear: z.coerce.number().int().min(2000, 'Fiscal year must be 2000 or later').max(2100, 'Fiscal year must be 2100 or earlier').optional(),
});

export type TrialBalanceParams = z.infer<typeof trialBalanceSchema>;
export type AccountLedgerParams = z.infer<typeof accountLedgerSchema>;
export type AccountBalanceParams = z.infer<typeof accountBalanceParamsSchema>;
