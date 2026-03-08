import { z } from 'zod';

/**
 * DPF User Custom Permissions Validation Schemas
 * Validates input for granting/denying user-specific permissions
 */

// List/Query validation
export const listCustomPermissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  userId: z.string().uuid().optional(),
  permissionType: z.enum(['GRANT', 'DENY']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

// Grant permission validation
export const grantPermissionSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID' }),
  permissionId: z.string().uuid({ message: 'Invalid permission ID' }),
  reason: z.string().min(5).max(1000).optional(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Expiration date must be in the future' }
    ),
});

// Deny permission validation
export const denyPermissionSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID' }),
  permissionId: z.string().uuid({ message: 'Invalid permission ID' }),
  reason: z.string().min(5, { message: 'Reason is required for denying permissions (min 5 characters)' }).max(1000),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Expiration date must be in the future' }
    ),
});

// Bulk grant permissions validation
export const bulkGrantPermissionsSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID' }),
  permissionIds: z
    .array(z.string().uuid())
    .min(1, { message: 'At least one permission is required' })
    .max(50, { message: 'Maximum 50 permissions can be granted at once' }),
  reason: z.string().min(5).max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Revoke custom permission validation
export const revokeCustomPermissionSchema = z.object({
  reason: z.string().min(5).max(1000).optional(),
});

// Update custom permission validation
export const updateCustomPermissionSchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  reason: z.string().min(5).max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Get user effective permissions validation
export const getUserEffectivePermissionsSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID' }),
});

export type ListCustomPermissionsQuery = z.infer<typeof listCustomPermissionsQuerySchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type DenyPermissionInput = z.infer<typeof denyPermissionSchema>;
export type BulkGrantPermissionsInput = z.infer<typeof bulkGrantPermissionsSchema>;
export type RevokeCustomPermissionInput = z.infer<typeof revokeCustomPermissionSchema>;
export type UpdateCustomPermissionInput = z.infer<typeof updateCustomPermissionSchema>;
