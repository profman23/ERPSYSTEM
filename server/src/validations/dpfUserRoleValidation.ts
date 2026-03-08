import { z } from 'zod';

/**
 * Assign Role to User Schema
 */
export const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleId: z.string().uuid('Invalid role ID'),
  assignedScope: z.enum(['GLOBAL', 'BUSINESS_LINE', 'BRANCH']).optional().default('GLOBAL'),
  businessLineId: z.string().uuid('Invalid business line ID').optional(),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (data) => {
    // If assignedScope is BUSINESS_LINE, businessLineId is required
    if (data.assignedScope === 'BUSINESS_LINE') {
      return !!data.businessLineId;
    }
    return true;
  },
  {
    message: 'Business line ID is required when assigned scope is BUSINESS_LINE',
    path: ['businessLineId'],
  }
).refine(
  (data) => {
    // If assignedScope is BRANCH, branchId is required
    if (data.assignedScope === 'BRANCH') {
      return !!data.branchId;
    }
    return true;
  },
  {
    message: 'Branch ID is required when assigned scope is BRANCH',
    path: ['branchId'],
  }
);

/**
 * Remove Role from User Schema
 */
export const removeRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Get User Role Schema (path param)
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * List Users with Roles Query Schema
 */
export const listUsersWithRolesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(), // Search in user name, email
  roleId: z.string().uuid('Invalid role ID').optional(), // Filter by specific role
  isActive: z.enum(['true', 'false']).optional(),
  assignedScope: z.enum(['GLOBAL', 'BUSINESS_LINE', 'BRANCH']).optional(),
  businessLineId: z.string().uuid('Invalid business line ID').optional(),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  sortBy: z.enum(['userName', 'email', 'assignedAt', 'expiresAt']).optional().default('assignedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Bulk Assign Role Schema
 */
export const bulkAssignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
  userIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user ID is required'),
  assignedScope: z.enum(['GLOBAL', 'BUSINESS_LINE', 'BRANCH']).optional().default('GLOBAL'),
  businessLineId: z.string().uuid('Invalid business line ID').optional(),
  branchId: z.string().uuid('Invalid branch ID').optional(),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.assignedScope === 'BUSINESS_LINE') {
      return !!data.businessLineId;
    }
    return true;
  },
  {
    message: 'Business line ID is required when assigned scope is BUSINESS_LINE',
    path: ['businessLineId'],
  }
).refine(
  (data) => {
    if (data.assignedScope === 'BRANCH') {
      return !!data.branchId;
    }
    return true;
  },
  {
    message: 'Branch ID is required when assigned scope is BRANCH',
    path: ['branchId'],
  }
);

/**
 * Role ID Parameter Schema
 */
export const roleIdParamSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
});

/**
 * Type Exports
 */
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof removeRoleSchema>;
export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
export type ListUsersWithRolesInput = z.infer<typeof listUsersWithRolesSchema>;
export type BulkAssignRoleInput = z.infer<typeof bulkAssignRoleSchema>;
export type RoleIdParamInput = z.infer<typeof roleIdParamSchema>;
