/**
 * Breeds Schema
 *
 * Animal breeds linked to species. Each breed belongs to exactly one species.
 * Example: "Golden Retriever" belongs to species "Dog".
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { species } from './species';

export const breeds = pgTable('breeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  speciesId: uuid('species_id').references(() => species.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),           // e.g., 'GOLDEN_RETRIEVER'
  name: varchar('name', { length: 255 }).notNull(),           // English name
  nameAr: varchar('name_ar', { length: 255 }),                // Arabic name
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('breeds_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('breeds_tenant_code_idx').on(table.tenantId, table.code),
  speciesIdIdx: index('breeds_species_id_idx').on(table.speciesId),
}));

export type Breed = typeof breeds.$inferSelect;
export type NewBreed = typeof breeds.$inferInsert;
