import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { dpfPermissions } from './dpfPermissions';

/**
 * DPF User Custom Permissions - User-specific permission overrides
 *
 * Enables flexible permission assignment beyond base role:
 * - GRANT: Additional permissions for specific user (e.g., Omar can view Purchase Requests)
 * - DENY: Explicit denials overriding role permissions (e.g., Omar can't delete warehouse items)
 *
 * Permission resolution formula:
 * effectivePermissions = rolePermissions + customGrants - customDenials
 *
 * Example use case:
 * - User: Omar
 * - Role: Warehouse Manager (WAREHOUSE:*)
 * - Custom Grants:
 *   - PURCHASING:PURCHASE_REQUESTS:VIEW
 *   - PURCHASING:GRPO:*
 *   - ACCOUNTING:AR_INVOICE:VIEW
 * - Custom Denials:
 *   - WAREHOUSE:ITEMS:DELETE (can't delete items despite having WAREHOUSE:*)
 *
 * Result: Omar has all warehouse permissions except delete, plus specific purchasing/accounting views
 */
export const dpfUserCustomPermissions = pgTable('dpf_user_custom_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  permissionId: uuid('permission_id')
    .references(() => dpfPermissions.id)
    .notNull(),
  permissionType: varchar('permission_type', { length: 10 }).notNull(), // 'GRANT' or 'DENY'
  assignedBy: uuid('assigned_by')
    .references(() => users.id)
    .notNull(), // Who granted/denied this permission
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  reason: text('reason'), // Why was this permission granted/denied? (audit trail)
  expiresAt: timestamp('expires_at'), // Optional expiration date for temporary permissions
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantUserIdx: index('dpf_ucp_tenant_user_idx').on(table.tenantId, table.userId),
  permissionIdx: index('dpf_ucp_permission_idx').on(table.permissionId),
  userActiveIdx: index('dpf_ucp_user_active_idx').on(table.userId, table.isActive),
}));
