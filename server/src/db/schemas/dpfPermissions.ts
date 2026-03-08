import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfModules } from './dpfModules';
import { dpfScreens } from './dpfScreens';
import { dpfActions } from './dpfActions';

/**
 * DPF Permissions - Dynamic permission definitions
 * Links permissions to modules, screens, and actions
 * CRITICAL: permission_code is unique PER TENANT (composite unique index via migration)
 */
export const dpfPermissions = pgTable('dpf_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  permissionCode: varchar('permission_code', { length: 100 }).notNull(), // e.g., 'PATIENT:CREATE' - unique per tenant via composite index
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
  permissionLevel: varchar('permission_level', { length: 20 }).notNull().default('APP'), // 'SYSTEM', 'ADMIN', 'APP'
  requiredScope: varchar('required_scope', { length: 50 }), // Minimum scope required
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
