/**
 * Audit Logs Schema
 * Enterprise-grade audit trail for compliance and debugging
 */

import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  action: varchar('action', { length: 50 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 36 }),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  diff: jsonb('diff'),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  clientIp: varchar('client_ip', { length: 45 }),
  userAgent: text('user_agent'),
  traceId: varchar('trace_id', { length: 50 }),
  correlationId: varchar('correlation_id', { length: 50 }),
  requestPath: varchar('request_path', { length: 255 }),
  requestMethod: varchar('request_method', { length: 10 }),
  statusCode: integer('status_code'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
