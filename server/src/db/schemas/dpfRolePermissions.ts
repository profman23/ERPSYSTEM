import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfRoles } from './dpfRoles';
import { dpfPermissions } from './dpfPermissions';

/**
 * DPF Role Permissions - Junction table
 * Links roles to permissions with tenant isolation
 * Relations: see ./relations.ts
 */
export const dpfRolePermissions = pgTable('dpf_role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  roleId: uuid('role_id')
    .references(() => dpfRoles.id)
    .notNull(),
  permissionId: uuid('permission_id')
    .references(() => dpfPermissions.id)
    .notNull(),
  grantedAgiLevel: varchar('granted_agi_level', { length: 50 }), // Override default AGI level for this permission
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
