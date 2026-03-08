/**
 * Warehouse Validation Schemas
 *
 * Pattern: speciesValidation.ts
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, page, limit, isActive, branchId, warehouseType)
 */

import { z } from 'zod';

export const createWarehouseSchema = z.object({
  branchId: z.string().uuid('Valid branch ID is required'),
  code: z.string().min(1, 'Warehouse code is required').max(50).toUpperCase(),
  name: z.string().min(1, 'Warehouse name is required').max(255),
  warehouseType: z.enum(['STANDARD', 'COLD_STORAGE', 'DROP_SHIP'], {
    errorMap: () => ({ message: 'Warehouse type must be STANDARD, COLD_STORAGE, or DROP_SHIP' }),
  }).default('STANDARD'),
  location: z.string().optional(),
  managerName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  // GL Accounts (SAP B1 Standard — 5 accounts per warehouse)
  inventoryAccountId: z.string().uuid('Invalid account ID').nullable().optional(),
  cogsAccountId: z.string().uuid('Invalid account ID').nullable().optional(),
  priceDifferenceAccountId: z.string().uuid('Invalid account ID').nullable().optional(),
  revenueAccountId: z.string().uuid('Invalid account ID').nullable().optional(),
  expenseAccountId: z.string().uuid('Invalid account ID').nullable().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const listWarehouseSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
  branchId: z.string().uuid().optional(),
  warehouseType: z.enum(['STANDARD', 'COLD_STORAGE', 'DROP_SHIP']).optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type ListWarehouseParams = z.infer<typeof listWarehouseSchema>;
