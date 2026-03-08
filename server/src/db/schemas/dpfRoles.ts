import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * DPF Roles - Enhanced role system with AGI integration
 * Replaces legacy roles table with DPF-compatible version
 * 
 * Built-in roles:
 * - SYSTEM_ADMIN: Platform-wide access (SYSTEM tenant only)
 * - TENANT_ADMIN: Tenant-wide access (auto-created per tenant)
 */
export const dpfRoles = pgTable('dpf_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  roleCode: varchar('role_code', { length: 100 }).notNull(), // e.g., 'SYSTEM_ADMIN', 'TENANT_ADMIN', 'VET_DOCTOR'
  roleName: varchar('role_name', { length: 255 }).notNull(),
  roleNameAr: varchar('role_name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  roleType: varchar('role_type', { length: 50 }).notNull(), // 'SYSTEM', 'TENANT', 'CUSTOM'
  roleLevel: varchar('role_level', { length: 20 }).notNull().default('APP'), // 'SYSTEM', 'ADMIN', 'APP'
  defaultAgiLevel: varchar('default_agi_level', { length: 50 }), // Default AGI access level for this role
  isSystemRole: varchar('is_system_role', { length: 10 }).notNull().default('false'), // Predefined system roles
  isBuiltIn: varchar('is_built_in', { length: 10 }).notNull().default('false'), // Built-in roles (SYSTEM_ADMIN, TENANT_ADMIN)
  isProtected: varchar('is_protected', { length: 10 }).notNull().default('false'), // Cannot be deleted
  isDefault: varchar('is_default', { length: 10 }).notNull().default('false'), // Auto-assigned to new users
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  metadata: jsonb('metadata'), // Additional role configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
