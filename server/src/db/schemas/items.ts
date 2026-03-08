/**
 * Items Schema (Item Master Data)
 *
 * Central domain entity: links Item Groups, UoMs, Warehouses, and (future) Tax Codes.
 * Follows SAP B1 pattern: 3 UoMs per item (inventory, purchase, sales) with conversion factors.
 * Inventory UoM = smallest sellable unit (IAS 2 / SAP B1 standard).
 * Item Code is auto-generated (ITM-00001) and immutable.
 *
 * Relations: see ./relations.ts
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { itemGroups } from './itemGroups';
import { unitOfMeasures } from './unitOfMeasures';
import { warehouses } from './warehouses';

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Business identifiers
  code: varchar('code', { length: 50 }).notNull(),           // Auto: ITM-00001
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  imageUrl: varchar('image_url', { length: 500 }),            // Relative path to uploaded image

  // Classification
  itemType: varchar('item_type', { length: 20 }).notNull(),   // 'ITEM' | 'SERVICE'
  itemGroupId: uuid('item_group_id')
    .references(() => itemGroups.id, { onDelete: 'set null' }),

  // Flags
  isInventoryItem: boolean('is_inventory_item').notNull().default(true),
  isSalesItem: boolean('is_sales_item').notNull().default(true),
  isPurchaseItem: boolean('is_purchase_item').notNull().default(true),
  isCounterSell: boolean('is_counter_sell').notNull().default(false),

  // UoM & Conversion (SAP B1 pattern: 3 UoMs + conversion factors at item level)
  inventoryUomId: uuid('inventory_uom_id')
    .references(() => unitOfMeasures.id, { onDelete: 'set null' }),
  purchaseUomId: uuid('purchase_uom_id')
    .references(() => unitOfMeasures.id, { onDelete: 'set null' }),
  purchaseUomFactor: numeric('purchase_uom_factor', { precision: 18, scale: 6 }).default('1'),
  salesUomId: uuid('sales_uom_id')
    .references(() => unitOfMeasures.id, { onDelete: 'set null' }),
  salesUomFactor: numeric('sales_uom_factor', { precision: 18, scale: 6 }).default('1'),

  // Pricing
  standardCost: numeric('standard_cost', { precision: 18, scale: 6 }),
  lastPurchasePrice: numeric('last_purchase_price', { precision: 18, scale: 6 }),
  defaultSellingPrice: numeric('default_selling_price', { precision: 18, scale: 6 }),

  // Inventory settings
  barcode: varchar('barcode', { length: 100 }),
  minimumStock: numeric('minimum_stock', { precision: 18, scale: 6 }),
  maximumStock: numeric('maximum_stock', { precision: 18, scale: 6 }),
  defaultWarehouseId: uuid('default_warehouse_id')
    .references(() => warehouses.id, { onDelete: 'set null' }),

  // Vendor (temporary text until Suppliers module)
  preferredVendor: varchar('preferred_vendor', { length: 255 }),

  // Concurrency control (optimistic locking)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory per CLAUDE.md
  tenantIsActiveIdx: index('items_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('items_tenant_code_idx')
    .on(table.tenantId, table.code),
  // Domain-specific query optimization
  tenantItemTypeIdx: index('items_tenant_item_type_idx')
    .on(table.tenantId, table.itemType),
  tenantBarcodeIdx: index('items_tenant_barcode_idx')
    .on(table.tenantId, table.barcode),
  tenantNameIdx: index('items_tenant_name_idx')
    .on(table.tenantId, table.name),
  // FK indexes
  itemGroupIdx: index('items_item_group_idx')
    .on(table.itemGroupId),
  inventoryUomIdx: index('items_inventory_uom_idx')
    .on(table.inventoryUomId),
  purchaseUomIdx: index('items_purchase_uom_idx')
    .on(table.purchaseUomId),
  salesUomIdx: index('items_sales_uom_idx')
    .on(table.salesUomId),
  defaultWarehouseIdx: index('items_default_warehouse_idx')
    .on(table.defaultWarehouseId),
}));

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
