import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfModules } from './dpfModules';
import { dpfScreens } from './dpfScreens';
import { dpfActions } from './dpfActions';

/**
 * DPF Permissions - Dynamic permission definitions
 * Links permissions to modules, screens, and actions
 */
export const dpfPermissions = pgTable('dpf_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  permissionCode: varchar('permission_code', { length: 100 }).notNull().unique(), // e.g., 'PATIENT:CREATE'
  permissionName: varchar('permission_name', { length: 255 }).notNull(),
  permissionNameAr: varchar('permission_name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  moduleId: uuid('module_id')
    .references(() => dpfModules.id)
    .notNull(),
  screenId: uuid('screen_id').references(() => dpfScreens.id), // Optional - for screen-specific permissions
  actionId: uuid('action_id').references(() => dpfActions.id), // Optional - for action-specific permissions
  permissionType: varchar('permission_type', { length: 50 }).notNull(), // 'MODULE', 'SCREEN', 'ACTION', 'API', 'SOCKET'
  requiredScope: varchar('required_scope', { length: 50 }), // Minimum scope required
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
