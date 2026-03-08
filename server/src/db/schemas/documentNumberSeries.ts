/**
 * Document Number Series Schema
 *
 * Branch-scoped, auto-seeded document numbering system (SAP B1 style).
 * When a branch is created, 7 series (one per document type) are auto-inserted.
 * Numbers are generated atomically via SELECT ... FOR UPDATE to prevent duplicates.
 *
 * Document types:
 *   - PURCHASE_ORDER, GOODS_RECEIPT_PO, SALES_INVOICE
 *   - CREDIT_NOTE, DELIVERY_NOTE, PAYMENT_RECEIPT, JOURNAL_ENTRY
 *
 * Number format (default): pure number — e.g., 10000001, 20000001
 * Admin can optionally add prefix/separator — e.g., PO-10000001
 *
 * Relations: see ./relations.ts
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const documentNumberSeries = pgTable('document_number_series', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  branchId: uuid('branch_id')
    .references(() => branches.id, { onDelete: 'cascade' })
    .notNull(),

  // Document type identifier
  documentType: varchar('document_type', { length: 30 }).notNull(),

  // Numbering configuration
  prefix: varchar('prefix', { length: 10 }).notNull().default(''),
  separator: varchar('separator', { length: 5 }).notNull().default(''),
  nextNumber: integer('next_number').notNull().default(1),
  padding: integer('padding').notNull().default(8),

  // Branch ordering (determines number range: branchSequence * 10_000_000 + nextNumber)
  branchSequence: integer('branch_sequence').notNull(),

  // Display names (bilingual)
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),

  // Concurrency control (optimistic locking for admin edits)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('doc_num_series_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  // Unique constraint: one series per branch per document type per tenant
  tenantBranchDocTypeIdx: uniqueIndex('doc_num_series_tenant_branch_doc_type_idx')
    .on(table.tenantId, table.branchId, table.documentType),
  // FK indexes
  branchIdIdx: index('doc_num_series_branch_id_idx')
    .on(table.branchId),
  // Query optimization: list by tenant + document type
  tenantDocTypeIdx: index('doc_num_series_tenant_doc_type_idx')
    .on(table.tenantId, table.documentType),
}));

export type DocumentNumberSeries = typeof documentNumberSeries.$inferSelect;
export type NewDocumentNumberSeries = typeof documentNumberSeries.$inferInsert;
