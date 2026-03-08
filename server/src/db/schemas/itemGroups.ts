/**
 * Item Groups Schema
 *
 * SAP B1 inspired item group management for categorizing inventory items.
 * Each item group links to GL accounts in the Chart of Accounts for
 * automatic journal entry generation on transactions.
 *
 * Item group types:
 *   - MEDICINE: medications and pharmaceuticals
 *   - SURGICAL_SUPPLY: surgical and medical supplies
 *   - EQUIPMENT: medical and clinic equipment
 *   - CONSUMABLE: general consumables (food, accessories, etc.)
 *   - SERVICE: non-inventory services (consultation, grooming, etc.)
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { chartOfAccounts } from './chartOfAccounts';
import { taxCodes } from './taxCodes';

export const itemGroups = pgTable('item_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Business identifiers
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),

  // Classification
  itemGroupType: varchar('item_group_type', { length: 50 }).notNull(),

  // GL Accounts (SAP B1 Standard — 4 accounts per item group)
  inventoryAccountId: uuid('inventory_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  cogsAccountId: uuid('cogs_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  purchaseAccountId: uuid('purchase_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  revenueAccountId: uuid('revenue_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),

  // Default tax codes for items in this group (SAP B1: separate sales/purchase)
  defaultSalesTaxCodeId: uuid('default_sales_tax_code_id')
    .references(() => taxCodes.id, { onDelete: 'set null' }),
  defaultPurchaseTaxCodeId: uuid('default_purchase_tax_code_id')
    .references(() => taxCodes.id, { onDelete: 'set null' }),

  // Extensible
  metadata: jsonb('metadata').default({}),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('item_groups_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: index('item_groups_tenant_code_idx')
    .on(table.tenantId, table.code),
  // Domain-specific query optimization
  tenantItemGroupTypeIdx: index('item_groups_tenant_type_idx')
    .on(table.tenantId, table.itemGroupType),
  // FK indexes
  inventoryAccountIdx: index('item_groups_inventory_account_idx')
    .on(table.inventoryAccountId),
  cogsAccountIdx: index('item_groups_cogs_account_idx')
    .on(table.cogsAccountId),
  purchaseAccountIdx: index('item_groups_purchase_account_idx')
    .on(table.purchaseAccountId),
  revenueAccountIdx: index('item_groups_revenue_account_idx')
    .on(table.revenueAccountId),
  defaultSalesTaxCodeIdx: index('item_groups_default_sales_tax_code_idx')
    .on(table.defaultSalesTaxCodeId),
  defaultPurchaseTaxCodeIdx: index('item_groups_default_purchase_tax_code_idx')
    .on(table.defaultPurchaseTaxCodeId),
}));

export type ItemGroup = typeof itemGroups.$inferSelect;
export type NewItemGroup = typeof itemGroups.$inferInsert;
