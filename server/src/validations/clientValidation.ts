/**
 * Client (Pet Owner) Validation Schemas
 *
 * Pattern:
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, page, limit, isActive)
 */

import { z } from 'zod';

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be 100 characters or less'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name must be 100 characters or less'),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone must be 50 characters or less').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d <= new Date();
    },
    { message: 'Date of birth cannot be in the future' }
  ),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsParams = z.infer<typeof listClientsSchema>;
