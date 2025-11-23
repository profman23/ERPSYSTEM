import { z } from 'zod';

export const createBusinessLineSchema = z.object({
  tenantId: z.string().uuid(),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  isActive: z.boolean().default(true),
});

export const updateBusinessLineSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  isActive: z.boolean().optional(),
});

export type CreateBusinessLineInput = z.infer<typeof createBusinessLineSchema>;
export type UpdateBusinessLineInput = z.infer<typeof updateBusinessLineSchema>;
