/**
 * Unit of Measure Validation Schemas
 *
 * Pattern:
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (partial + version for optimistic locking)
 *   - listSchema:   validates GET query params (search, page, limit, isActive)
 */

import { z } from 'zod';

/** Base shape — reused for both create and update (partial). */
const unitOfMeasureBaseShape = {
  code: z.string()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or fewer')
    .toUpperCase(),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or fewer'),
  nameAr: z.string().max(255, 'Arabic name must be 255 characters or fewer').optional(),
  symbol: z.string().max(20, 'Symbol must be 20 characters or fewer').optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
} as const;

export const createUnitOfMeasureSchema = z.object(unitOfMeasureBaseShape);

export const updateUnitOfMeasureSchema = z.object(unitOfMeasureBaseShape)
  .partial()
  .extend({
    version: z.number().int().positive('Version is required for concurrent edit safety'),
    isActive: z.boolean().optional(),
  });

export const listUnitOfMeasuresSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateUnitOfMeasureInput = z.infer<typeof createUnitOfMeasureSchema>;
export type UpdateUnitOfMeasureInput = z.infer<typeof updateUnitOfMeasureSchema>;
export type ListUnitOfMeasuresParams = z.infer<typeof listUnitOfMeasuresSchema>;
