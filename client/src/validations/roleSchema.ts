import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// Role Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Authorization levels (SAP B1 Style)
export const AuthorizationLevel = {
  NONE: 0,
  READ_ONLY: 1,
  FULL: 2,
} as const;

export type AuthorizationLevelType = typeof AuthorizationLevel[keyof typeof AuthorizationLevel];

// Screen authorization schema
const screenAuthorizationSchema = z.record(
  z.string(), // screenCode
  z.number().min(0).max(2) // authorization level (0, 1, 2)
);

// ═══════════════════════════════════════════════════════════════
// Create Role Schema
// ═══════════════════════════════════════════════════════════════
export const createRoleSchema = z.object({
  roleName: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Role name can only contain letters, numbers, spaces, underscores, and hyphens'),

  roleNameAr: z
    .string()
    .max(100, 'Arabic role name must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  scope: z.enum(['system', 'tenant', 'branch']).default('tenant'),

  screenAuthorizations: screenAuthorizationSchema.optional().default({}),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

// ═══════════════════════════════════════════════════════════════
// Update Role Schema
// ═══════════════════════════════════════════════════════════════
export const updateRoleSchema = z.object({
  roleName: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Role name can only contain letters, numbers, spaces, underscores, and hyphens')
    .optional(),

  roleNameAr: z
    .string()
    .max(100, 'Arabic role name must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  screenAuthorizations: screenAuthorizationSchema.optional(),

  isActive: z.boolean().optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ═══════════════════════════════════════════════════════════════
// Assign Role to User Schema
// ═══════════════════════════════════════════════════════════════
export const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  scope: z.enum(['system', 'tenant', 'branch']).optional(),
  scopeId: z.string().uuid('Invalid scope ID').optional(),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

// ═══════════════════════════════════════════════════════════════
// Bulk Update Screen Authorizations Schema
// ═══════════════════════════════════════════════════════════════
export const bulkUpdateAuthorizationsSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  authorizations: z.array(z.object({
    screenCode: z.string().min(1, 'Screen code is required'),
    level: z.number().min(0).max(2),
  })),
});

export type BulkUpdateAuthorizationsInput = z.infer<typeof bulkUpdateAuthorizationsSchema>;
