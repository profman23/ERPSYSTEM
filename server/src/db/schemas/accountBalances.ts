/**
 * Account Balances Schema — GL Materialized Ledger
 *
 * One row per (tenant × account × sub-period × branch) — SAP B1 pattern.
 * Updated atomically inside the JE creation transaction via GLPostingService.
 *
 * This is NOT a standalone entity (no code/name) — it's a materialized aggregate
 * that enables instant Trial Balance queries without scanning millions of JE lines.
 *
 * Closing = Opening + Period (invariant maintained by UPSERT logic).
 *
 * Relations: see ./relations.ts
 */

import {
  pgTable,
  uuid,
  boolean,
  integer,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { chartOfAccounts } from './chartOfAccounts';
import { postingSubPeriods } from './postingPeriods';
import { branches } from './branches';

export const accountBalances = pgTable('account_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => chartOfAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  postingSubPeriodId: uuid('posting_sub_period_id')
    .references(() => postingSubPeriods.id, { onDelete: 'cascade' })
    .notNull(),
  branchId: uuid('branch_id')
    .references(() => branches.id, { onDelete: 'cascade' })
    .notNull(),

  // Denormalized for fast filtering (avoids JOIN to sub-period → period)
  fiscalYear: integer('fiscal_year').notNull(),
  periodNumber: integer('period_number').notNull(),         // 1-12

  // Opening balance (carried forward from previous period or year-end close)
  openingDebit: numeric('opening_debit', { precision: 18, scale: 4 }).notNull().default('0'),
  openingCredit: numeric('opening_credit', { precision: 18, scale: 4 }).notNull().default('0'),

  // Period movements (accumulated from all JE lines posted in this period)
  periodDebit: numeric('period_debit', { precision: 18, scale: 4 }).notNull().default('0'),
  periodCredit: numeric('period_credit', { precision: 18, scale: 4 }).notNull().default('0'),

  // Closing = opening + period (denormalized for instant Trial Balance)
  closingDebit: numeric('closing_debit', { precision: 18, scale: 4 }).notNull().default('0'),
  closingCredit: numeric('closing_credit', { precision: 18, scale: 4 }).notNull().default('0'),

  // Transaction count for reconciliation / zero-movement detection
  transactionCount: integer('transaction_count').notNull().default(0),

  // Concurrency control (optimistic locking)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory per CLAUDE.md
  tenantIsActiveIdx: index('ab_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),

  // Core unique constraint — one balance per (account, period, branch) per tenant
  tenantAccountPeriodBranchIdx: uniqueIndex('ab_tenant_account_period_branch_idx')
    .on(table.tenantId, table.accountId, table.postingSubPeriodId, table.branchId),

  // Trial Balance: all accounts for a tenant in a fiscal year
  tenantFiscalYearIdx: index('ab_tenant_fiscal_year_idx')
    .on(table.tenantId, table.fiscalYear),

  // Account drill-down: all periods for one account
  tenantAccountYearIdx: index('ab_tenant_account_year_idx')
    .on(table.tenantId, table.accountId, table.fiscalYear),

  // Branch consolidation
  tenantBranchYearIdx: index('ab_tenant_branch_year_idx')
    .on(table.tenantId, table.branchId, table.fiscalYear),

  // FK indexes
  accountIdIdx: index('ab_account_id_idx').on(table.accountId),
  postingSubPeriodIdIdx: index('ab_posting_sub_period_id_idx').on(table.postingSubPeriodId),
  branchIdIdx: index('ab_branch_id_idx').on(table.branchId),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type AccountBalance = typeof accountBalances.$inferSelect;
export type NewAccountBalance = typeof accountBalances.$inferInsert;
