/**
 * Species Validation Schemas (Reference Feature Template)
 *
 * COPY THIS FILE for any new domain entity validations.
 * Pattern:
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, page, limit, isActive)
 */

import { z } from 'zod';

export const createSpeciesSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  icon: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateSpeciesSchema = createSpeciesSchema.partial();

export const listSpeciesSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateSpeciesInput = z.infer<typeof createSpeciesSchema>;
export type UpdateSpeciesInput = z.infer<typeof updateSpeciesSchema>;
export type ListSpeciesParams = z.infer<typeof listSpeciesSchema>;
