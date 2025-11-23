import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * DPF AGI Logs - Audit trail for AGI operations
 * Tracks all AGI-powered permission operations
 */
export const dpfAgiLogs = pgTable('dpf_agi_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  userId: uuid('user_id').references(() => users.id), // User who initiated AGI action
  agiOperation: varchar('agi_operation', { length: 100 }).notNull(), // e.g., 'CREATE_ROLE', 'ASSIGN_PERMISSION'
  inputCommand: text('input_command'), // Original natural language command
  inputLanguage: varchar('input_language', { length: 10 }), // 'en' or 'ar'
  parsedIntent: jsonb('parsed_intent'), // AGI's interpretation
  executedAction: varchar('executed_action', { length: 100 }), // What was executed
  targetEntityType: varchar('target_entity_type', { length: 50 }), // 'ROLE', 'USER', 'PERMISSION'
  targetEntityId: uuid('target_entity_id'), // ID of affected entity
  status: varchar('status', { length: 50 }).notNull(), // 'SUCCESS', 'FAILED', 'REQUIRES_APPROVAL', 'DENIED'
  failureReason: text('failure_reason'),
  safetyChecksPassed: varchar('safety_checks_passed', { length: 10 }), // 'true' or 'false'
  safetyViolations: jsonb('safety_violations'), // Array of violated safety rules
  approvedBy: uuid('approved_by').references(() => users.id), // For operations requiring approval
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
