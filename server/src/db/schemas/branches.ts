import { pgTable, uuid, varchar, timestamp, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { businessLines } from './businessLines';

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  businessLineId: uuid('business_line_id').references(() => businessLines.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  address: text('address'),
  buildingNumber: varchar('building_number', { length: 50 }),
  district: varchar('district', { length: 100 }),
  vatRegistrationNumber: varchar('vat_registration_number', { length: 50 }),
  commercialRegistrationNumber: varchar('commercial_registration_number', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  timezone: varchar('timezone', { length: 100 }),
  workingHours: jsonb('working_hours').default({}),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('branches_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('branches_tenant_code_idx').on(table.tenantId, table.code),
  businessLineIdx: index('branches_business_line_idx').on(table.businessLineId),
  tenantBusinessLineIdx: index('branches_tenant_bl_idx').on(table.tenantId, table.businessLineId),
}));

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
