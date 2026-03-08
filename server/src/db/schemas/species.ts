/**
 * Species Schema (Reference Feature Template)
 *
 * COPY THIS FILE as a starting point for any new domain table.
 * Every domain table follows the same pattern:
 *   - uuid primary key
 *   - tenantId FK (ALWAYS)
 *   - code (unique per tenant, for API references)
 *   - name / nameAr (bilingual)
 *   - isActive (soft delete)
 *   - createdAt / updatedAt
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const species = pgTable('species', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),        // e.g., 'DOG', 'CAT', 'BIRD'
  name: varchar('name', { length: 255 }).notNull(),        // English name
  nameAr: varchar('name_ar', { length: 255 }),             // Arabic name
  description: text('description'),
  descriptionAr: text('description_ar'),
  icon: varchar('icon', { length: 100 }),                  // Icon identifier
  metadata: jsonb('metadata').default({}),                 // Extensible JSON
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('species_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('species_tenant_code_idx').on(table.tenantId, table.code),
}));

export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;
