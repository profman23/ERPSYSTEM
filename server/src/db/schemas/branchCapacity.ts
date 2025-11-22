import { pgTable, uuid, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { businessLines } from './businessLines';
import { branches } from './branches';

export const branchCapacity = pgTable('branch_capacity', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  businessLineId: uuid('business_line_id').references(() => businessLines.id).notNull(),
  branchId: uuid('branch_id').references(() => branches.id).notNull(),
  allowedUsers: integer('allowed_users').notNull().default(0),
});
