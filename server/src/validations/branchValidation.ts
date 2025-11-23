import { z } from 'zod';

export const createBranchSchema = z.object({
  tenantId: z.string().uuid(),
  businessLineId: z.string().uuid(),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(50).optional(),
  address: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(50).optional(),
  address: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
