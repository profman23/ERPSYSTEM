import { z } from 'zod';

/**
 * List Query Schema - for filtering and pagination
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(), // Search in permissionCode, permissionName
  isActive: z.enum(['true', 'false']).optional(),
  moduleId: z.string().uuid('Invalid module ID').optional(),
  screenId: z.string().uuid('Invalid screen ID').optional(),
  actionId: z.string().uuid('Invalid action ID').optional(),
  permissionType: z.enum(['MODULE', 'SCREEN', 'ACTION', 'API', 'SOCKET']).optional(),
  sortBy: z.enum(['permissionCode', 'permissionName', 'permissionType', 'createdAt']).optional().default('permissionName'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Assign Permissions to Role Schema
 */
export const assignPermissionsSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  permissionIds: z.array(z.string().uuid('Invalid permission ID')),
});

/**
 * Remove Permissions from Role Schema
 */
export const removePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID')).min(1, 'At least one permission ID is required'),
});

/**
 * ID Parameter Schema (for route params)
 */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid permission ID format'),
});

/**
 * Role ID Parameter Schema
 */
export const roleIdParamSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
});

/**
 * Type Exports
 */
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
export type RemovePermissionsInput = z.infer<typeof removePermissionsSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type RoleIdParamInput = z.infer<typeof roleIdParamSchema>;
