import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Authentication Validation Schemas
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// Login Schema
// ═══════════════════════════════════════════════════════════════
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),

  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ═══════════════════════════════════════════════════════════════
// Register Schema (if self-registration is enabled)
// ═══════════════════════════════════════════════════════════════
export const registerSchema = z.object({
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

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  confirmPassword: z.string(),

  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ═══════════════════════════════════════════════════════════════
// Forgot Password Schema
// ═══════════════════════════════════════════════════════════════
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ═══════════════════════════════════════════════════════════════
// Reset Password Schema
// ═══════════════════════════════════════════════════════════════
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ═══════════════════════════════════════════════════════════════
// Verify Email Schema
// ═══════════════════════════════════════════════════════════════
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ═══════════════════════════════════════════════════════════════
// Two-Factor Authentication Schema
// ═══════════════════════════════════════════════════════════════
export const twoFactorSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type TwoFactorInput = z.infer<typeof twoFactorSchema>;

// ═══════════════════════════════════════════════════════════════
// Refresh Token Schema
// ═══════════════════════════════════════════════════════════════
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
