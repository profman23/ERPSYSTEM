import { z } from 'zod';

export const createTenantSchema = z.object({
  code: z.string().min(2).max(10).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  name: z.string().min(2).max(100),
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  country: z.string().min(2).max(50).optional(),
  timezone: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  defaultLanguage: z.enum(['en', 'ar']).optional(),
  country: z.string().min(2).max(50).optional(),
  timezone: z.string().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
