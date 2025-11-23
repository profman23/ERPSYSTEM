import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * DPF Modules - Auto-registered system modules
 * Every module in the system auto-registers here
 */
export const dpfModules = pgTable('dpf_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(), // Tenant isolation
  moduleCode: varchar('module_code', { length: 100 }).notNull(), // e.g., 'PATIENT_MGMT'
  moduleName: varchar('module_name', { length: 255 }).notNull(), // e.g., 'Patient Management'
  moduleNameAr: varchar('module_name_ar', { length: 255 }), // Arabic name
  description: text('description'),
  descriptionAr: text('description_ar'),
  category: varchar('category', { length: 100 }), // e.g., 'CLINICAL', 'FINANCE', 'ADMIN'
  icon: varchar('icon', { length: 100 }), // Icon identifier
  route: varchar('route', { length: 255 }), // Frontend route
  sortOrder: varchar('sort_order', { length: 50 }).default('0'), // Display order
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  isSystemModule: varchar('is_system_module', { length: 10 }).notNull().default('false'), // System-level modules
  requiredAgiLevel: varchar('required_agi_level', { length: 50 }), // NO_ACCESS, READ_ONLY, SUGGEST, AUTOMATE, AUTONOMOUS
  metadata: jsonb('metadata'), // Additional module-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
