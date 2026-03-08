/**
 * Tax Codes Schema
 *
 * SAP B1 inspired tax code management for purchases and sales.
 * Each tax code links to GL accounts in the Chart of Accounts.
 * Will be referenced by Item Groups, Item Master, Invoice Lines, PO Lines.
 *
 * Tax types:
 *   - OUTPUT_TAX: collected on sales (VAT Payable → LIABILITY)
 *   - INPUT_TAX: paid on purchases (VAT Receivable → ASSET)
 *   - EXEMPT: no tax applied
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
  date,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { chartOfAccounts } from './chartOfAccounts';

export const taxCodes = pgTable('tax_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Business identifiers
  code: varchar('code', { length: 50 }).notNull(),          // e.g., 'VAT15-OUT', 'EXEMPT'
  name: varchar('name', { length: 255 }).notNull(),          // English name
  nameAr: varchar('name_ar', { length: 255 }),               // Arabic name (for seed data)
  description: text('description'),
  descriptionAr: text('description_ar'),

  // Tax configuration
  taxType: varchar('tax_type', { length: 20 }).notNull(),    // OUTPUT_TAX, INPUT_TAX, EXEMPT
  rate: numeric('rate', { precision: 7, scale: 4 }).notNull().default('0'),
  calculationMethod: varchar('calculation_method', { length: 20 })
    .notNull()
    .default('PERCENTAGE'),                                   // PERCENTAGE, FIXED_AMOUNT, TAX_INCLUDED

  // Account links (FK to chartOfAccounts — the GL accounts for posting)
  salesTaxAccountId: uuid('sales_tax_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),
  purchaseTaxAccountId: uuid('purchase_tax_account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' }),

  // Compliance / effective dating
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  jurisdiction: varchar('jurisdiction', { length: 100 }),

  // Extensible
  metadata: jsonb('metadata').default({}),

  // Concurrency control (optimistic locking for financial records)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('tax_codes_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('tax_codes_tenant_code_idx')
    .on(table.tenantId, table.code),
  // Domain-specific query optimization
  tenantTaxTypeIdx: index('tax_codes_tenant_tax_type_idx')
    .on(table.tenantId, table.taxType),
  // FK indexes
  salesTaxAccountIdx: index('tax_codes_sales_tax_account_idx')
    .on(table.salesTaxAccountId),
  purchaseTaxAccountIdx: index('tax_codes_purchase_tax_account_idx')
    .on(table.purchaseTaxAccountId),
}));

export type TaxCode = typeof taxCodes.$inferSelect;
export type NewTaxCode = typeof taxCodes.$inferInsert;
