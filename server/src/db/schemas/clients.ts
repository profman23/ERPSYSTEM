/**
 * Clients Schema (Pet Owners)
 *
 * People who bring their pets to the veterinary clinic.
 * Each client can own multiple patients (pets).
 * Code is auto-generated in the service layer (CLT-000001).
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, date, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),            // Auto-generated: CLT-000001
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  dateOfBirth: date('date_of_birth'),
  address: text('address'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('clients_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('clients_tenant_code_idx').on(table.tenantId, table.code),
  tenantEmailIdx: index('clients_tenant_email_idx').on(table.tenantId, table.email),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
