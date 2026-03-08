import { z } from 'zod';

export const createBusinessLineSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(20).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  businessLineType: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email('Invalid email format').max(255).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional().or(z.literal('')),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional().or(z.literal('')),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const updateBusinessLineSchema = createBusinessLineSchema.omit({ code: true }).partial();

export const listBusinessLineSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateBusinessLineInput = z.infer<typeof createBusinessLineSchema>;
export type UpdateBusinessLineInput = z.infer<typeof updateBusinessLineSchema>;
export type ListBusinessLineInput = z.infer<typeof listBusinessLineSchema>;
