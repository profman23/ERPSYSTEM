/**
 * Tax Code Validation Schemas
 *
 * Follows speciesValidation.ts pattern.
 * - createSchema: POST body
 * - updateSchema: PUT body (partial, omits taxType — immutable after creation)
 * - listSchema:   GET query params
 */

import { z } from 'zod';

export const createTaxCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Tax code is required')
    .max(50, 'Tax code must be 50 characters or less')
    .toUpperCase(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  taxType: z.enum(['OUTPUT_TAX', 'INPUT_TAX', 'EXEMPT'], {
    required_error: 'Tax type is required',
    invalid_type_error: 'Tax type must be OUTPUT_TAX, INPUT_TAX, or EXEMPT',
  }),
  rate: z
    .number({ invalid_type_error: 'Rate must be a number' })
    .min(0, 'Rate cannot be negative')
    .max(100, 'Rate cannot exceed 100')
    .default(0),
  calculationMethod: z
    .enum(['PERCENTAGE', 'FIXED_AMOUNT', 'TAX_INCLUDED'])
    .default('PERCENTAGE'),
  salesTaxAccountId: z.string().uuid('Invalid sales tax account ID').nullable().optional(),
  purchaseTaxAccountId: z.string().uuid('Invalid purchase tax account ID').nullable().optional(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .nullable()
    .optional(),
  jurisdiction: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return data.effectiveTo > data.effectiveFrom;
    }
    return true;
  },
  { message: 'Effective To must be after Effective From', path: ['effectiveTo'] },
).refine(
  (data) => {
    if (data.taxType === 'EXEMPT' && data.rate !== 0) {
      return false;
    }
    return true;
  },
  { message: 'Exempt tax codes must have a rate of 0', path: ['rate'] },
);

export const updateTaxCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Tax code is required')
    .max(50)
    .toUpperCase()
    .optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255)
    .optional(),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  // taxType is intentionally omitted — immutable after creation
  rate: z
    .number({ invalid_type_error: 'Rate must be a number' })
    .min(0, 'Rate cannot be negative')
    .max(100, 'Rate cannot exceed 100')
    .optional(),
  calculationMethod: z
    .enum(['PERCENTAGE', 'FIXED_AMOUNT', 'TAX_INCLUDED'])
    .optional(),
  salesTaxAccountId: z.string().uuid('Invalid sales tax account ID').nullable().optional(),
  purchaseTaxAccountId: z.string().uuid('Invalid purchase tax account ID').nullable().optional(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .nullable()
    .optional(),
  jurisdiction: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  version: z.number().int().positive('Version must be a positive integer'),
}).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return data.effectiveTo > data.effectiveFrom;
    }
    return true;
  },
  { message: 'Effective To must be after Effective From', path: ['effectiveTo'] },
);

export const listTaxCodesSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
  taxType: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.enum(['OUTPUT_TAX', 'INPUT_TAX', 'EXEMPT']).optional(),
  ),
});

export type CreateTaxCodeInput = z.infer<typeof createTaxCodeSchema>;
export type UpdateTaxCodeInput = z.infer<typeof updateTaxCodeSchema>;
export type ListTaxCodesParams = z.infer<typeof listTaxCodesSchema>;
