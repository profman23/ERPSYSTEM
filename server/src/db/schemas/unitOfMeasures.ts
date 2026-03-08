/**
 * Unit of Measure Schema
 *
 * Core setup entity used across Inventory, Pharmacy, Clinical, POS, and Purchasing.
 * Supports base-unit conversion (e.g., G → KG with factor 0.001).
 *
 * 15 default veterinary UoMs are seeded per tenant on creation.
 * Admins can add, edit, and deactivate units from the UI.
 *
 * Optimistic locking via `version` column for concurrent edits.
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

export const unitOfMeasures = pgTable('unit_of_measures', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Business identifiers
  code: varchar('code', { length: 50 }).notNull(),           // e.g., 'KG', 'ML', 'TABLET'
  name: varchar('name', { length: 255 }).notNull(),           // English name
  nameAr: varchar('name_ar', { length: 255 }),                // Arabic name
  symbol: varchar('symbol', { length: 20 }),                  // Display symbol: 'kg', 'ml', 'tab'
  description: text('description'),
  descriptionAr: text('description_ar'),

  // Conversion system
  baseUnitCode: varchar('base_unit_code', { length: 50 }),    // null = IS a base unit
  conversionFactor: numeric('conversion_factor', { precision: 18, scale: 6 }), // e.g., G→KG = 0.001

  // Concurrency control (optimistic locking)
  version: integer('version').notNull().default(1),

  // Standard fields
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Mandatory indexes per CLAUDE.md
  tenantIsActiveIdx: index('uom_tenant_is_active_idx')
    .on(table.tenantId, table.isActive),
  tenantCodeIdx: uniqueIndex('uom_tenant_code_idx')
    .on(table.tenantId, table.code),
  // Conversion chain lookups
  tenantBaseUnitIdx: index('uom_tenant_base_unit_idx')
    .on(table.tenantId, table.baseUnitCode),
}));

export type UnitOfMeasure = typeof unitOfMeasures.$inferSelect;
export type NewUnitOfMeasure = typeof unitOfMeasures.$inferInsert;
