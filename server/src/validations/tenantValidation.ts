import { z } from 'zod';

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const subscriptionPlanValues = ['trial', 'standard', 'professional', 'enterprise'] as const;

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  code: z.string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code must contain only letters, numbers, hyphens, and underscores')
    .optional(),
  countryCode: z.string().length(2, 'Country code must be 2 characters'),
  country: z.string().min(2).max(100).optional(),
  timezone: z.string().max(100).optional(),
  subscriptionPlan: z.enum(subscriptionPlanValues).default('trial'),
  allowedBusinessLines: z.number().min(1).max(1000).optional(),
  allowedBranches: z.number().min(1).max(5000).optional(),
  allowedUsers: z.number().min(1).max(100000).optional(),
  storageLimitGB: z.number().min(1).max(10000).optional(),
  apiRateLimit: z.number().min(100).max(1000000).optional(),
  primaryColor: z.string().regex(hexColorRegex, 'Primary color must be a valid hex color').optional().default('#2563EB'),
  accentColor: z.string().regex(hexColorRegex, 'Accent color must be a valid hex color').optional().default('#8B5CF6'),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  defaultLanguage: z.enum(['en', 'ar']).optional().default('en'),
  aiAssistantEnabled: z.boolean().optional().default(false),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  countryCode: z.string().length(2).optional(),
  country: z.string().min(2).max(100).optional(),
  timezone: z.string().max(100).optional(),
  subscriptionPlan: z.enum(subscriptionPlanValues).optional(),
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
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  aiAssistantEnabled: z.boolean().optional(),
});

export const checkTenantCodeSchema = z.object({
  code: z.string().min(2).max(50),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
