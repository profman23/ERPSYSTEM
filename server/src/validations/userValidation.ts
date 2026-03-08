import { z } from 'zod';

export const createUserSchema = z.object({
  businessLineId: z.string().uuid('Invalid business line ID').optional().nullable(),
  branchId: z.string().uuid('Invalid branch ID').optional().nullable(),
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().max(50).optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'veterinarian', 'receptionist', 'user', 'staff']).default('staff'),
  accessScope: z.enum(['system', 'tenant', 'business_line', 'branch', 'mixed']).default('branch'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50).optional(),
  phone: z.string().max(50).optional().or(z.literal('')),
  avatarUrl: z.string().max(500).optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'veterinarian', 'receptionist', 'user', 'staff']).optional(),
  accessScope: z.enum(['system', 'tenant', 'business_line', 'branch', 'mixed']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().uuid().optional().nullable(),
  businessLineId: z.string().uuid().optional().nullable(),
  allowedBranchIds: z.array(z.string().uuid()).optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const listUserSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  businessLineId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  scope: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUserInput = z.infer<typeof listUserSchema>;
