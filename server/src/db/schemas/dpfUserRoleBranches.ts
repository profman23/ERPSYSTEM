/**
 * DPF User Role Branches - Branch-level access control
 *
 * Purpose: Defines which branches a user can access with their role permissions
 * Performance: Optimized for 3000+ tenants with composite indexes
 *
 * Example:
 * - User: Ahmed (Warehouse Manager)
 * - Role: WAREHOUSE_MANAGER (permissions: INVENTORY:*)
 * - Branches: Cairo Branch, Alexandria Branch
 * - Result: Can manage inventory ONLY in Cairo & Alexandria
 */

import { pgTable, uuid, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfUserRoles } from './dpfUserRoles';
import { branches } from './branches';

export const dpfUserRoleBranches = pgTable(
  'dpf_user_role_branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    userRoleId: uuid('user_role_id')
      .references(() => dpfUserRoles.id, { onDelete: 'cascade' })
      .notNull(),

    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),

    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: User role can't have duplicate branches
    uniqueUserRoleBranch: unique('unique_user_role_branch').on(
      table.userRoleId,
      table.branchId
    ),

    // Performance indexes for fast lookups
    // Index 1: Lookup by user role (most common query)
    idxUserRole: index('idx_dpf_user_role_branches_user_role').on(table.userRoleId),

    // Index 2: Lookup by branch (for branch-based queries)
    idxBranch: index('idx_dpf_user_role_branches_branch').on(table.branchId),

    // Index 3: Composite index for tenant + user role (hot path)
    idxTenantUserRole: index('idx_dpf_user_role_branches_tenant_user_role').on(
      table.tenantId,
      table.userRoleId
    ),

    // Index 4: Full composite for permission checks (critical for performance)
    idxFullComposite: index('idx_dpf_user_role_branches_full').on(
      table.tenantId,
      table.userRoleId,
      table.branchId
    ),
  })
);

export type DPFUserRoleBranch = typeof dpfUserRoleBranches.$inferSelect;
export type NewDPFUserRoleBranch = typeof dpfUserRoleBranches.$inferInsert;
