/**
 * Posting Periods Schema (SAP B1 Fiscal Year / Posting Periods)
 *
 * Two tables:
 *   1. posting_periods   — fiscal year header (e.g., FY-2026)
 *   2. posting_sub_periods — 12 monthly sub-periods per fiscal year
 *
 * Sub-period status flow: OPEN → CLOSED → LOCKED
 * Users can enable/disable sub-periods to control posting.
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
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ─── Fiscal Year Header ───────────────────────────────────────────────────────

export const postingPeriods = pgTable('posting_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  code: varchar('code', { length: 50 }).notNull(),           // e.g., "FY-2026"
  name: varchar('name', { length: 255 }).notNull(),           // "Fiscal Year 2026"
  nameAr: varchar('name_ar', { length: 255 }),                // "السنة المالية 2026"

  fiscalYear: integer('fiscal_year').notNull(),               // e.g., 2026
  numberOfPeriods: integer('number_of_periods').notNull().default(12),
  startDate: date('start_date').notNull(),                    // fiscal year start
  endDate: date('end_date').notNull(),                        // fiscal year end

  // Concurrency control
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('posting_periods_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('posting_periods_tenant_code_idx')
    .on(table.tenantId, table.code),
  tenantFiscalYearIdx: uniqueIndex('posting_periods_tenant_fiscal_year_idx')
    .on(table.tenantId, table.fiscalYear),
}));

// ─── Monthly Sub-Periods ──────────────────────────────────────────────────────

export const postingSubPeriods = pgTable('posting_sub_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  postingPeriodId: uuid('posting_period_id')
    .references(() => postingPeriods.id, { onDelete: 'cascade' })
    .notNull(),

  periodNumber: integer('period_number').notNull(),           // 1–12
  code: varchar('code', { length: 50 }).notNull(),            // e.g., "FY-2026-01"
  name: varchar('name', { length: 255 }).notNull(),           // "January 2026"
  nameAr: varchar('name_ar', { length: 255 }),                // "يناير 2026"

  startDate: date('start_date').notNull(),                    // month start
  endDate: date('end_date').notNull(),                        // month end

  // OPEN = posting allowed, CLOSED = no new posting, LOCKED = immutable
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),

  // Concurrency control
  version: integer('version').notNull().default(1),

  // Standard fields — isActive doubles as enable/disable posting toggle
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('posting_sub_periods_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('posting_sub_periods_tenant_code_idx')
    .on(table.tenantId, table.code),
  postingPeriodIdx: index('posting_sub_periods_posting_period_idx')
    .on(table.postingPeriodId),
  tenantPeriodNumberIdx: uniqueIndex('posting_sub_periods_tenant_period_number_idx')
    .on(table.tenantId, table.postingPeriodId, table.periodNumber),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostingPeriod = typeof postingPeriods.$inferSelect;
export type NewPostingPeriod = typeof postingPeriods.$inferInsert;
export type PostingSubPeriod = typeof postingSubPeriods.$inferSelect;
export type NewPostingSubPeriod = typeof postingSubPeriods.$inferInsert;
