/**
 * Item Group Validation Schemas
 *
 * Pattern:
 *   - createSchema: validates POST body
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, page, limit, isActive, itemGroupType)
 */

import { z } from 'zod';

const ITEM_GROUP_TYPES = ['MEDICINE', 'SURGICAL_SUPPLY', 'EQUIPMENT', 'CONSUMABLE', 'SERVICE'] as const;

export const createItemGroupSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50).toUpperCase(),
  name: z.string().min(1, 'Name is required').max(255),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  itemGroupType: z.enum(ITEM_GROUP_TYPES, {
    errorMap: () => ({ message: 'Item group type is required' }),
  }),
  inventoryAccountId: z.string().uuid().nullable().optional(),
  cogsAccountId: z.string().uuid().nullable().optional(),
  purchaseAccountId: z.string().uuid().nullable().optional(),
  revenueAccountId: z.string().uuid().nullable().optional(),
  defaultSalesTaxCodeId: z.string().uuid().nullable().optional(),
  defaultPurchaseTaxCodeId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateItemGroupSchema = createItemGroupSchema.partial();

export const listItemGroupSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
  itemGroupType: z.enum(ITEM_GROUP_TYPES).optional(),
});

export type CreateItemGroupInput = z.infer<typeof createItemGroupSchema>;
export type UpdateItemGroupInput = z.infer<typeof updateItemGroupSchema>;
export type ListItemGroupParams = z.infer<typeof listItemGroupSchema>;
