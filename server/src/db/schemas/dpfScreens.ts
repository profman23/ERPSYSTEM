import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfModules } from './dpfModules';

/**
 * DPF Screens - Auto-registered screens/submodules
 * Every screen/page in the system auto-registers here
 */
export const dpfScreens = pgTable('dpf_screens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => dpfModules.id)
    .notNull(),
  screenCode: varchar('screen_code', { length: 100 }).notNull(), // e.g., 'PATIENT_LIST'
  screenName: varchar('screen_name', { length: 255 }).notNull(),
  screenNameAr: varchar('screen_name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  route: varchar('route', { length: 255 }), // Frontend route
  componentPath: varchar('component_path', { length: 500 }), // Component file path
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  requiredAgiLevel: varchar('required_agi_level', { length: 50 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
