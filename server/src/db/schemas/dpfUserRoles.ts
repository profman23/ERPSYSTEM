import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { dpfRoles } from './dpfRoles';
import { businessLines } from './businessLines';
import { branches } from './branches';

/**
 * DPF User Roles - Junction table with scope support
 * Links users to roles with tenant/business-line/branch scoping
 */
export const dpfUserRoles = pgTable('dpf_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  roleId: uuid('role_id')
    .references(() => dpfRoles.id)
    .notNull(),
  assignedScope: varchar('assigned_scope', { length: 50 }).notNull(), // 'SYSTEM', 'TENANT', 'BUSINESS_LINE', 'BRANCH'
  businessLineId: uuid('business_line_id').references(() => businessLines.id), // For business-line-scoped roles
  branchId: uuid('branch_id').references(() => branches.id), // For branch-scoped roles
  assignedBy: uuid('assigned_by').references(() => users.id), // Who assigned this role
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  expiresAt: timestamp('expires_at'), // Optional expiration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
