import { z } from 'zod';

/**
 * Validation schemas for DPF User Role Branch operations
 */

export const assignBranchesSchema = z.object({
  userRoleId: z.string().uuid('Invalid user role ID format'),
  branchIds: z.array(z.string().uuid('Invalid branch ID format')).min(1, 'At least one branch must be selected'),
});

export const userRoleIdParamSchema = z.object({
  userRoleId: z.string().uuid('Invalid user role ID format'),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().uuid('Invalid branch ID format'),
});

export const removeBranchSchema = z.object({
  userRoleId: z.string().uuid('Invalid user role ID format'),
  branchId: z.string().uuid('Invalid branch ID format'),
});
