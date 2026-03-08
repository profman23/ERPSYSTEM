/**
 * Warehouses Schema
 *
 * Every branch has at least one warehouse (default created automatically).
 * Additional warehouses can be created manually.
 * GL Accounts: 5 SAP B1-standard accounts per warehouse (all nullable FKs to chart_of_accounts).
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { chartOfAccounts } from './chartOfAccounts';

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  warehouseType: varchar('warehouse_type', { length: 20 }).notNull().default('STANDARD'),
  location: text('location'),
  managerName: varchar('manager_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isDefault: boolean('is_default').notNull().default(false),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  // GL Accounts (SAP B1 Standard — 5 accounts per warehouse)
  inventoryAccountId: uuid('inventory_account_id').references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  cogsAccountId: uuid('cogs_account_id').references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  priceDifferenceAccountId: uuid('price_difference_account_id').references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  revenueAccountId: uuid('revenue_account_id').references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  expenseAccountId: uuid('expense_account_id').references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('warehouses_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('warehouses_tenant_code_idx').on(table.tenantId, table.code),
  branchIdx: index('warehouses_branch_idx').on(table.branchId),
  tenantBranchIdx: index('warehouses_tenant_branch_idx').on(table.tenantId, table.branchId),
  inventoryAccountIdx: index('warehouses_inventory_account_idx').on(table.inventoryAccountId),
  cogsAccountIdx: index('warehouses_cogs_account_idx').on(table.cogsAccountId),
  priceDiffAccountIdx: index('warehouses_price_diff_account_idx').on(table.priceDifferenceAccountId),
  revenueAccountIdx: index('warehouses_revenue_account_idx').on(table.revenueAccountId),
  expenseAccountIdx: index('warehouses_expense_account_idx').on(table.expenseAccountId),
}));

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
