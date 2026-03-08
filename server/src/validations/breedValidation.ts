/**
 * Breed Validation Schemas
 *
 * Pattern:
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, speciesId, page, limit, isActive)
 */

import { z } from 'zod';

export const createBreedSchema = z.object({
  speciesId: z.string().uuid('Species is required'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less').toUpperCase(),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  nameAr: z.string().max(255, 'Arabic name must be 255 characters or less').optional(),
  description: z.string().optional(),
});

export const updateBreedSchema = createBreedSchema.partial();

export const listBreedsSchema = z.object({
  search: z.string().optional(),
  speciesId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateBreedInput = z.infer<typeof createBreedSchema>;
export type UpdateBreedInput = z.infer<typeof updateBreedSchema>;
export type ListBreedsParams = z.infer<typeof listBreedsSchema>;
