import { z } from 'zod';

/**
 * Branch Validation Schemas
 * Follows SAP B1 enterprise pattern with structured address fields.
 */

export const createBranchSchema = z.object({
  businessLineId: z.string().uuid('Invalid business line ID'),
  name: z.string().min(2, 'Branch name must be at least 2 characters').max(255),
  country: z.string().min(2, 'Country is required').max(10),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  address: z.string().min(2, 'Street is required').max(500),
  buildingNumber: z.string().min(1, 'Building number is required').max(50),
  vatRegistrationNumber: z.string().min(2, 'VAT registration number is required').max(50),
  commercialRegistrationNumber: z.string().min(2, 'Commercial registration number is required').max(100),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email format').max(255).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  timezone: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = createBranchSchema
  .omit({ businessLineId: true })
  .partial();

export const listBranchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  businessLineId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type ListBranchInput = z.infer<typeof listBranchSchema>;
