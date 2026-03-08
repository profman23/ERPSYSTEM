/**
 * Chart of Accounts Schema (Financial Module - Phase 1)
 *
 * Tree-structured account hierarchy using Adjacency List + Materialized Path.
 * Every tenant gets their own COA seeded from a default template on creation.
 *
 * Tree strategy:
 *   - parentId: self-referencing FK (null = root account)
 *   - path: materialized path "1000.1100.1110" for natural sort + ancestry
 *   - level: denormalized depth (0 = root) for quick filtering
 *
 * SAP B1 inspired:
 *   - 5 account types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
 *   - isPostable: false = group, true = leaf (accepts journal entries)
 *   - normalBalance: DEBIT or CREDIT (auto-derived from type)
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
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: uuid('parent_id')
    .references((): AnyPgColumn => chartOfAccounts.id, { onDelete: 'set null' }),

  // Business identifiers
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),

  // Account classification
  accountType: varchar('account_type', { length: 20 }).notNull(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  normalBalance: varchar('normal_balance', { length: 10 }).notNull(), // DEBIT, CREDIT
  isPostable: boolean('is_postable').notNull().default(false),

  // Tree structure (denormalized for performance)
  level: integer('level').notNull().default(0),
  path: varchar('path', { length: 500 }).notNull(), // "1000.1100.1110"

  // Financial attributes
  currency: varchar('currency', { length: 3 }), // ISO 4217
  isCashAccount: boolean('is_cash_account').notNull().default(false),
  isBankAccount: boolean('is_bank_account').notNull().default(false),
  isSystemAccount: boolean('is_system_account').notNull().default(false),

  // Extensible
  metadata: jsonb('metadata').default({}),

  // Concurrency control (CLAUDE.md: optimistic locking for financial records)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('coa_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('coa_tenant_code_idx')
    .on(table.tenantId, table.code),
  // FK indexes
  parentIdIdx: index('coa_parent_id_idx')
    .on(table.parentId),
  // Query optimization indexes
  tenantTypeIdx: index('coa_tenant_type_idx')
    .on(table.tenantId, table.accountType),
  tenantPathIdx: index('coa_tenant_path_idx')
    .on(table.tenantId, table.path),
}));

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
