import { z } from 'zod';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code must contain only letters, numbers, hyphens, and underscores'),
  country: z.string().min(2).max(100).optional(),
  timezone: z.string().max(100).optional().default('UTC'),
  subscriptionPlan: z.enum(['trial', 'standard', 'enterprise']).optional().default('trial'),
  allowedBusinessLines: z.number().min(1).max(1000).optional().default(5),
  allowedBranches: z.number().min(1).max(5000).optional().default(10),
  allowedUsers: z.number().min(1).max(100000).optional().default(50),
  storageLimitGB: z.number().min(1).max(10000).optional().default(10),
  apiRateLimit: z.number().min(100).max(1000000).optional().default(1000),
  primaryColor: z.string().regex(hexColorRegex, 'Primary color must be a valid hex color').optional().default('#2563EB'),
  accentColor: z.string().regex(hexColorRegex, 'Accent color must be a valid hex color').optional().default('#8B5CF6'),
  contactEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  defaultLanguage: z.enum(['en', 'ar']).optional().default('en'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  timezone: z.string().max(100).optional(),
  subscriptionPlan: z.enum(['trial', 'standard', 'enterprise']).optional(),
  allowedBusinessLines: z.number().min(1).max(1000).optional(),
  allowedBranches: z.number().min(1).max(5000).optional(),
  allowedUsers: z.number().min(1).max(100000).optional(),
  storageLimitGB: z.number().min(1).max(10000).optional(),
  apiRateLimit: z.number().min(100).max(1000000).optional(),
  primaryColor: z.string().regex(hexColorRegex, 'Primary color must be a valid hex color').optional(),
  accentColor: z.string().regex(hexColorRegex, 'Accent color must be a valid hex color').optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  defaultLanguage: z.enum(['en', 'ar']).optional(),
});

export const checkTenantCodeSchema = z.object({
  code: z.string().min(2).max(20),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
