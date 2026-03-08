/**
 * Chart of Accounts Validation Schemas
 *
 * Server validation is SINGLE SOURCE OF TRUTH.
 * Client validates for UX only.
 */

import { z } from 'zod';

// ─── Account Type & Normal Balance Enums ────────────────────────────────

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const;
export type NormalBalance = typeof NORMAL_BALANCES[number];

// ─── CREATE SCHEMA ──────────────────────────────────────────────────────

export const createChartOfAccountSchema = z.object({
  code: z.string()
    .min(1, 'Account code is required')
    .max(50, 'Account code must be at most 50 characters')
    .regex(/^[A-Z0-9\-_.]+$/, 'Account code can only contain uppercase letters, numbers, hyphens, dots, and underscores')
    .transform(val => val.toUpperCase()),

  name: z.string()
    .min(1, 'Account name is required')
    .max(255, 'Account name must be at most 255 characters'),

  nameAr: z.string()
    .max(255, 'Arabic name must be at most 255 characters')
    .optional(),

  description: z.string().optional(),
  descriptionAr: z.string().optional(),

  parentId: z.string()
    .uuid('Parent account ID must be a valid UUID')
    .nullable()
    .optional(),

  accountType: z.enum(ACCOUNT_TYPES, {
    required_error: 'Account type is required',
    invalid_type_error: 'Account type must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE',
  }),

  normalBalance: z.enum(NORMAL_BALANCES, {
    invalid_type_error: 'Normal balance must be DEBIT or CREDIT',
  }).optional(),

  isPostable: z.boolean().optional().default(false),

  currency: z.string()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .transform(val => val.toUpperCase())
    .optional(),

  isCashAccount: z.boolean().optional().default(false),
  isBankAccount: z.boolean().optional().default(false),

  metadata: z.record(z.unknown()).optional(),
});

// ─── UPDATE SCHEMA ──────────────────────────────────────────────────────
// accountType is immutable after creation (SAP B1 rule)

export const updateChartOfAccountSchema = createChartOfAccountSchema
  .partial()
  .omit({ accountType: true })
  .extend({
    version: z.coerce.number().int().positive('Version is required for optimistic locking').optional(),
  });

// ─── MOVE SCHEMA ────────────────────────────────────────────────────────

export const moveChartOfAccountSchema = z.object({
  newParentId: z.string()
    .uuid('New parent ID must be a valid UUID')
    .nullable(),
});

// ─── LIST SCHEMA ────────────────────────────────────────────────────────

export const listChartOfAccountsSchema = z.object({
  search: z.string().optional(),

  page: z.coerce.number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce.number()
    .int()
    .positive()
    .max(100)
    .default(100),

  isActive: z.enum(['true', 'false']).optional(),

  accountType: z.enum(ACCOUNT_TYPES).optional(),

  isPostable: z.enum(['true', 'false']).optional(),

  parentId: z.string().uuid().optional(),
});

// ─── TYPE EXPORTS ───────────────────────────────────────────────────────

export type CreateChartOfAccountInput = z.infer<typeof createChartOfAccountSchema>;
export type UpdateChartOfAccountInput = z.infer<typeof updateChartOfAccountSchema>;
export type MoveChartOfAccountInput = z.infer<typeof moveChartOfAccountSchema>;
export type ListChartOfAccountsParams = z.infer<typeof listChartOfAccountsSchema>;
