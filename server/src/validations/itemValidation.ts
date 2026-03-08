/**
 * Item Validation Schemas
 *
 * Pattern: baseShape + .superRefine() for cross-field rules.
 * Update uses baseShape.partial() + version for optimistic locking.
 *
 * Cross-field rules:
 *   - ITEM type requires inventoryUomId
 *   - purchaseUomId set → purchaseUomFactor must be > 0
 *   - salesUomId set → salesUomFactor must be > 0
 *   - minimumStock <= maximumStock (if both provided)
 */

import { z } from 'zod';

// ─── Base Shape ──────────────────────────────────────────────────────────────

const itemBaseShape = {
  name: z.string()
    .min(1, 'Item name is required')
    .max(255, 'Item name must be 255 characters or fewer'),
  nameAr: z.string().max(255, 'Arabic name must be 255 characters or fewer').optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),

  // Classification
  itemType: z.enum(['ITEM', 'SERVICE'], {
    required_error: 'Item type is required',
    invalid_type_error: 'Item type must be ITEM or SERVICE',
  }),
  itemGroupId: z.string().uuid('Invalid item group').optional().nullable(),

  // Flags
  isInventoryItem: z.boolean().default(true),
  isSalesItem: z.boolean().default(true),
  isPurchaseItem: z.boolean().default(true),
  isCounterSell: z.boolean().default(false),

  // UoM & Conversion
  inventoryUomId: z.string().uuid('Invalid inventory UoM').optional().nullable(),
  purchaseUomId: z.string().uuid('Invalid purchase UoM').optional().nullable(),
  purchaseUomFactor: z.coerce.number().positive('Purchase UoM factor must be positive').default(1),
  salesUomId: z.string().uuid('Invalid sales UoM').optional().nullable(),
  salesUomFactor: z.coerce.number().positive('Sales UoM factor must be positive').default(1),

  // Pricing
  standardCost: z.coerce.number().nonnegative('Standard cost cannot be negative').optional().nullable(),
  lastPurchasePrice: z.coerce.number().nonnegative('Purchase price cannot be negative').optional().nullable(),
  defaultSellingPrice: z.coerce.number().nonnegative('Selling price cannot be negative').optional().nullable(),

  // Inventory
  barcode: z.string().max(100, 'Barcode must be 100 characters or fewer').optional().nullable(),
  minimumStock: z.coerce.number().nonnegative('Minimum stock cannot be negative').optional().nullable(),
  maximumStock: z.coerce.number().nonnegative('Maximum stock cannot be negative').optional().nullable(),
  defaultWarehouseId: z.string().uuid('Invalid warehouse').optional().nullable(),

  // Vendor
  preferredVendor: z.string().max(255, 'Vendor name must be 255 characters or fewer').optional().nullable(),
} as const;

// ─── Create Schema ──────────────────────────────────────────────────────────

export const createItemSchema = z.object(itemBaseShape).superRefine((data, ctx) => {
  // ITEM type requires inventoryUomId
  if (data.itemType === 'ITEM' && !data.inventoryUomId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Inventory UoM is required for inventory items',
      path: ['inventoryUomId'],
    });
  }

  // purchaseUomId set → factor must be provided and positive
  if (data.purchaseUomId && (!data.purchaseUomFactor || data.purchaseUomFactor <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Purchase UoM factor must be a positive number',
      path: ['purchaseUomFactor'],
    });
  }

  // salesUomId set → factor must be provided and positive
  if (data.salesUomId && (!data.salesUomFactor || data.salesUomFactor <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Sales UoM factor must be a positive number',
      path: ['salesUomFactor'],
    });
  }

  // minimumStock <= maximumStock
  if (
    data.minimumStock != null &&
    data.maximumStock != null &&
    data.minimumStock > data.maximumStock
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum stock cannot exceed maximum stock',
      path: ['minimumStock'],
    });
  }
});

// ─── Update Schema ──────────────────────────────────────────────────────────
// Note: .superRefine() produces ZodEffects which doesn't support .partial().
// So update uses the raw shape partial + version extension.
// Cross-field validation for updates is handled in the service layer.

export const updateItemSchema = z.object(itemBaseShape)
  .partial()
  .extend({
    version: z.number().int().positive('Version is required for concurrent edit safety'),
    isActive: z.boolean().optional(),
  });

// ─── List Schema ────────────────────────────────────────────────────────────

export const listItemsSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
  itemType: z.enum(['ITEM', 'SERVICE']).optional(),
  itemGroupId: z.string().uuid().optional(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ListItemsParams = z.infer<typeof listItemsSchema>;
