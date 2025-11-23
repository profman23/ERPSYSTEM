import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * DPF Roles - Enhanced role system with AGI integration
 * Replaces legacy roles table with DPF-compatible version
 */
export const dpfRoles = pgTable('dpf_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  roleCode: varchar('role_code', { length: 100 }).notNull(), // e.g., 'VET_DOCTOR'
  roleName: varchar('role_name', { length: 255 }).notNull(),
  roleNameAr: varchar('role_name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  roleType: varchar('role_type', { length: 50 }).notNull(), // 'SYSTEM', 'TENANT', 'CUSTOM'
  defaultAgiLevel: varchar('default_agi_level', { length: 50 }), // Default AGI access level for this role
  isSystemRole: varchar('is_system_role', { length: 10 }).notNull().default('false'), // Predefined system roles
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  metadata: jsonb('metadata'), // Additional role configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
