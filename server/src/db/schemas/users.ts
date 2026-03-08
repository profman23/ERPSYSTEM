import { pgTable, uuid, varchar, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { businessLines } from './businessLines';
import { branches } from './branches';

export const accessScopeEnum = ['tenant', 'business_line', 'branch', 'mixed'] as const;
export type AccessScope = typeof accessScopeEnum[number];

export const userStatusEnum = ['active', 'inactive', 'suspended', 'pending'] as const;
export type UserStatus = typeof userStatusEnum[number];

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }),
  name: varchar('name', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  role: varchar('role', { length: 50 }).notNull().default('staff'),
  accessScope: varchar('access_scope', { length: 50 }).notNull().default('branch'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  businessLineId: uuid('business_line_id').references(() => businessLines.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  allowedBranchIds: jsonb('allowed_branch_ids').default([]),
  preferences: jsonb('preferences').default({}),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('users_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantEmailIdx: index('users_tenant_email_idx').on(table.tenantId, table.email),
  branchIdx: index('users_branch_idx').on(table.branchId),
  businessLineIdx: index('users_business_line_idx').on(table.businessLineId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
