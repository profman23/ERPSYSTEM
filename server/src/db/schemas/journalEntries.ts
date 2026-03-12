/**
 * Journal Entries Schema (Double-Entry Bookkeeping Engine)
 *
 * Two tables:
 *   1. journal_entries      — header (dates, branch, status, source document link)
 *   2. journal_entry_lines  — debit/credit lines (account + amount)
 *
 * Golden rule: SUM(debit) = SUM(credit) — enforced in service before save.
 *
 * Document Immutability:
 *   - Save = POSTED (no DRAFT status). Immutable after creation.
 *   - Status flow: POSTED → REVERSED (only 2 states)
 *   - Corrections via Reverse Transactions only (new entry with swapped debit/credit)
 *
 * Source types:
 *   - MANUAL: user-created journal entry
 *   - SALES_INVOICE, PURCHASE_ORDER, PAYMENT, CREDIT_NOTE, etc.: auto-created by future modules
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
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { users } from './users';
import { chartOfAccounts } from './chartOfAccounts';
import { postingSubPeriods } from './postingPeriods';

// ─── Journal Entry Header ────────────────────────────────────────────────────

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  branchId: uuid('branch_id')
    .references(() => branches.id, { onDelete: 'cascade' })
    .notNull(),

  // Document identity
  code: varchar('code', { length: 50 }).notNull(),           // Auto-generated via DocumentNumberSeriesService
  postingDate: date('posting_date').notNull(),                // Validated against posting periods
  documentDate: date('document_date').notNull(),
  dueDate: date('due_date'),                                  // For AP/AR entries

  // Description
  remarks: text('remarks'),
  remarksAr: text('remarks_ar'),
  reference: varchar('reference', { length: 255 }),           // External reference (invoice #, check #, etc.)

  // Source document link (for auto-created JEs from invoices, POs, etc.)
  sourceType: varchar('source_type', { length: 50 }).notNull().default('MANUAL'),
  sourceId: uuid('source_id'),                                // Nullable — null for manual entries

  // Status: POSTED (immutable) or REVERSED (reversed by another entry)
  status: varchar('status', { length: 20 }).notNull().default('POSTED'),

  // Reversal linking (self-referencing FKs)
  reversalOfId: uuid('reversal_of_id')
    .references((): AnyPgColumn => journalEntries.id, { onDelete: 'set null' }),
  reversedById: uuid('reversed_by_id')
    .references((): AnyPgColumn => journalEntries.id, { onDelete: 'set null' }),

  // Denormalized totals for fast display
  totalDebit: numeric('total_debit', { precision: 18, scale: 4 }).notNull().default('0'),
  totalCredit: numeric('total_credit', { precision: 18, scale: 4 }).notNull().default('0'),

  // Posting period link (resolved from postingDate during creation)
  postingSubPeriodId: uuid('posting_sub_period_id')
    .references(() => postingSubPeriods.id, { onDelete: 'set null' }),

  // Who created this entry (save = posted, so createdBy = postedBy)
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' }),

  // Concurrency control (optimistic locking for reversal operation)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('je_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('je_tenant_code_idx')
    .on(table.tenantId, table.code),
  // Query optimization indexes
  tenantPostingDateIdx: index('je_tenant_posting_date_idx')
    .on(table.tenantId, table.postingDate),
  tenantStatusIdx: index('je_tenant_status_idx')
    .on(table.tenantId, table.status),
  tenantSourceIdx: index('je_tenant_source_idx')
    .on(table.tenantId, table.sourceType, table.sourceId),
  // FK indexes
  postingSubPeriodIdIdx: index('je_posting_sub_period_id_idx')
    .on(table.postingSubPeriodId),
  branchIdIdx: index('je_branch_id_idx')
    .on(table.branchId),
  reversalOfIdIdx: index('je_reversal_of_id_idx')
    .on(table.reversalOfId),
  createdByIdx: index('je_created_by_idx')
    .on(table.createdBy),
}));

// ─── Journal Entry Lines ─────────────────────────────────────────────────────

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  journalEntryId: uuid('journal_entry_id')
    .references(() => journalEntries.id, { onDelete: 'cascade' })
    .notNull(),

  lineNumber: integer('line_number').notNull(),               // 1-based sequential

  // Account reference (must be postable account)
  accountId: uuid('account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'set null' })
    .notNull(),

  // Amounts — each line: debit XOR credit > 0 (never both, never both zero)
  debit: numeric('debit', { precision: 18, scale: 4 }).notNull().default('0'),
  credit: numeric('credit', { precision: 18, scale: 4 }).notNull().default('0'),

  // Line description
  remarks: text('remarks'),
  remarksAr: text('remarks_ar'),

  // Future dimension
  costCenter: varchar('cost_center', { length: 100 }),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('jel_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  // FK indexes
  journalEntryIdIdx: index('jel_journal_entry_id_idx')
    .on(table.journalEntryId),
  accountIdIdx: index('jel_account_id_idx')
    .on(table.accountId),
  // Unique constraint: line ordering within an entry
  tenantEntryLineIdx: uniqueIndex('jel_tenant_entry_line_idx')
    .on(table.tenantId, table.journalEntryId, table.lineNumber),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;
