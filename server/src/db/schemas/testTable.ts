import { pgTable, uuid, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Test Table - جدول اختباري لتخزين البيانات للتجربة
 */
export const testTable = pgTable('test_table', {
  id: uuid('id').defaultRandom().primaryKey(),

  // بيانات أساسية
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // بيانات رقمية
  quantity: integer('quantity').default(0),

  // حالة
  isActive: boolean('is_active').default(true),

  // تواريخ
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // بيانات إضافية
  metadata: text('metadata'), // يمكن تخزين JSON هنا
});

export type TestTable = typeof testTable.$inferSelect;
export type NewTestTable = typeof testTable.$inferInsert;
