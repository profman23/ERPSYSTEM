import { pgTable, uuid, varchar, timestamp, integer, unique, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfRoles } from './dpfRoles';

/**
 * DPF Role Screen Authorizations (SAP B1 Style)
 * Links roles to screens with authorization levels
 *
 * Authorization Levels:
 * - 0: No Authorization (screen hidden, route blocked)
 * - 1: Read Only (view only, no create/update)
 * - 2: Full Authorization (all operations allowed)
 *
 * Relations: see ./relations.ts
 */
export const dpfRoleScreenAuthorizations = pgTable('dpf_role_screen_authorizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  roleId: uuid('role_id')
    .references(() => dpfRoles.id)
    .notNull(),
  screenCode: varchar('screen_code', { length: 100 }).notNull(), // Direct reference to screen code
  authorizationLevel: integer('authorization_level').notNull().default(0), // 0=None, 1=ReadOnly, 2=Full
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRoleScreen: unique('unique_role_screen').on(table.roleId, table.screenCode),
  tenantRoleIdx: index('dpf_rsa_tenant_role_idx').on(table.tenantId, table.roleId),
  roleScreenIdx: index('dpf_rsa_role_screen_idx').on(table.roleId, table.screenCode),
}));
