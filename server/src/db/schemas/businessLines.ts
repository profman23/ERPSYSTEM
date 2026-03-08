import { pgTable, uuid, varchar, timestamp, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const businessLineTypeEnum = [
  'general',
  'emergency',
  'surgery',
  'grooming',
  'pharmacy',
  'laboratory',
  'boarding',
  'rehabilitation',
  'dental',
  'imaging',
  'specialty',
  'mobile',
] as const;
export type BusinessLineType = typeof businessLineTypeEnum[number];

export const businessLines = pgTable('business_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  businessLineType: varchar('business_line_type', { length: 50 }).notNull().default('general'),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 50 }),
  secondaryColor: varchar('secondary_color', { length: 50 }),
  accentColor: varchar('accent_color', { length: 50 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('bl_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('bl_tenant_code_idx').on(table.tenantId, table.code),
}));

export type BusinessLine = typeof businessLines.$inferSelect;
export type NewBusinessLine = typeof businessLines.$inferInsert;
