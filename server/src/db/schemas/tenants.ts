import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  defaultLanguage: varchar('default_language', { length: 10 }).notNull().default('en'),
  country: varchar('country', { length: 100 }),
  timezone: varchar('timezone', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
