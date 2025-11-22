import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { businessLines } from './businessLines';
import { branches } from './branches';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  accessScope: varchar('access_scope', { length: 50 }).notNull().default('tenant'),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  businessLineId: uuid('business_line_id').references(() => businessLines.id),
  branchId: uuid('branch_id').references(() => branches.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
