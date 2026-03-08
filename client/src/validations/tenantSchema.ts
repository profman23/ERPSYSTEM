import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Tenant Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Subscription plans
export const SubscriptionPlans = ['trial', 'standard', 'professional', 'enterprise'] as const;
export type SubscriptionPlan = typeof SubscriptionPlans[number];

// Tenant statuses
export const TenantStatuses = ['active', 'inactive', 'suspended', 'pending'] as const;
export type TenantStatus = typeof TenantStatuses[number];

// ═══════════════════════════════════════════════════════════════
// Create Tenant Schema
// ═══════════════════════════════════════════════════════════════
export const createTenantSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),

  nameAr: z
    .string()
    .max(100, 'Arabic name must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only')
    .optional(), // Auto-generated if not provided

  contactEmail: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  contactPhone: z
    .string()
    .regex(/^[\d\s+\-()]*$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  country: z
    .string()
    .min(2, 'Please select a country')
    .max(100, 'Country must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  timezone: z
    .string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
    .or(z.literal('')),

  subscriptionPlan: z.enum(SubscriptionPlans).default('trial'),

  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g., #8B5CF6)')
    .optional()
    .or(z.literal('')),

  logoUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  maxUsers: z
    .number()
    .min(1, 'Maximum users must be at least 1')
    .max(10000, 'Maximum users cannot exceed 10,000')
    .optional(),

  maxBranches: z
    .number()
    .min(1, 'Maximum branches must be at least 1')
    .max(1000, 'Maximum branches cannot exceed 1,000')
    .optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

// ═══════════════════════════════════════════════════════════════
// Update Tenant Schema
// ═══════════════════════════════════════════════════════════════
export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .optional(),

  nameAr: z
    .string()
    .max(100, 'Arabic name must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  contactEmail: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  contactPhone: z
    .string()
    .regex(/^[\d\s+\-()]*$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  country: z
    .string()
    .max(100, 'Country must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  timezone: z
    .string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional()
    .or(z.literal('')),

  subscriptionPlan: z.enum(SubscriptionPlans).optional(),

  status: z.enum(TenantStatuses).optional(),

  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g., #8B5CF6)')
    .optional()
    .or(z.literal('')),

  logoUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  maxUsers: z
    .number()
    .min(1, 'Maximum users must be at least 1')
    .max(10000, 'Maximum users cannot exceed 10,000')
    .optional(),

  maxBranches: z
    .number()
    .min(1, 'Maximum branches must be at least 1')
    .max(1000, 'Maximum branches cannot exceed 1,000')
    .optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

// ═══════════════════════════════════════════════════════════════
// Tenant Settings Schema
// ═══════════════════════════════════════════════════════════════
export const tenantSettingsSchema = z.object({
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  currency: z.string().max(10, 'Currency code must be less than 10 characters').default('USD'),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Fiscal year start must be in MM-DD format').default('01-01'),
  workingDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]), // 0=Sunday, 6=Saturday
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
