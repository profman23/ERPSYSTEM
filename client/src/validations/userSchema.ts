import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// User Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Base user fields shared across schemas
const baseUserFields = {
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'First name can only contain letters'),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'Last name can only contain letters'),

  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),

  phone: z
    .string()
    .regex(/^[\d\s+\-()]*$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
};

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ═══════════════════════════════════════════════════════════════
// Create System User Schema
// ═══════════════════════════════════════════════════════════════
export const createSystemUserSchema = z.object({
  ...baseUserFields,
  password: passwordSchema,
  confirmPassword: z.string(),
  roleId: z.string().uuid('Please select a valid role'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type CreateSystemUserInput = z.infer<typeof createSystemUserSchema>;

// ═══════════════════════════════════════════════════════════════
// Create Tenant Admin Schema
// ═══════════════════════════════════════════════════════════════
export const createTenantAdminSchema = z.object({
  ...baseUserFields,
  password: passwordSchema,
  confirmPassword: z.string(),
  tenantId: z.string().uuid('Please select a valid tenant'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type CreateTenantAdminInput = z.infer<typeof createTenantAdminSchema>;

// ═══════════════════════════════════════════════════════════════
// Update User Schema (password optional)
// ═══════════════════════════════════════════════════════════════
export const updateUserSchema = z.object({
  ...baseUserFields,
  password: passwordSchema.optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ═══════════════════════════════════════════════════════════════
// User Profile Schema (self-update)
// ═══════════════════════════════════════════════════════════════
export const userProfileSchema = z.object({
  firstName: baseUserFields.firstName,
  lastName: baseUserFields.lastName,
  phone: baseUserFields.phone,
  avatarUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

// ═══════════════════════════════════════════════════════════════
// Change Password Schema
// ═══════════════════════════════════════════════════════════════
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
