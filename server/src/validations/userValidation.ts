import { z } from 'zod';

export const createUserSchema = z.object({
  tenantId: z.string().uuid(),
  businessLineId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  email: z.string().email(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'manager', 'veterinarian', 'receptionist', 'user']).default('user'),
  accessScope: z.enum(['system', 'tenant', 'business_line', 'branch']).default('branch'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(['admin', 'manager', 'veterinarian', 'receptionist', 'user']).optional(),
  accessScope: z.enum(['system', 'tenant', 'business_line', 'branch']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
