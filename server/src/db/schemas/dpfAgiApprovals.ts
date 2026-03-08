import { pgTable, uuid, varchar, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * DPF AGI Approvals - Approval workflow for AI actions
 * Enterprise-grade with comprehensive audit trail
 */
export const dpfAgiApprovals = pgTable('dpf_agi_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Requester
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // The action to be approved (stored as JSON)
  actionType: varchar('action_type', { length: 50 }).notNull(), // NAVIGATE, CREATE, UPDATE, DELETE, etc.
  actionTarget: varchar('action_target', { length: 255 }).notNull(), // Module/Screen/Entity
  actionParams: jsonb('action_params'), // Parameters for the action
  actionDescription: text('action_description').notNull(),
  actionDescriptionAr: text('action_description_ar'),

  // Risk assessment
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL
  isDestructive: varchar('is_destructive', { length: 10 }).notNull().default('false'),

  // Original user message
  originalMessage: text('original_message').notNull(),
  detectedLanguage: varchar('detected_language', { length: 5 }).default('en'), // en, ar

  // Status
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, APPROVED, REJECTED, EXPIRED, EXECUTED

  // Approval info
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),

  // Rejection info
  rejectedBy: uuid('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),

  // Execution info
  executedAt: timestamp('executed_at'),
  executionResult: jsonb('execution_result'),
  executionError: text('execution_error'),

  // Expiration
  expiresAt: timestamp('expires_at').notNull(),

  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for tenant + status (most common query)
  tenantStatusIdx: index('dpf_agi_approvals_tenant_status_idx').on(table.tenantId, table.status),
  // Index for user lookup
  userIdx: index('dpf_agi_approvals_user_idx').on(table.userId),
  // Index for pending approvals by tenant
  pendingIdx: index('dpf_agi_approvals_pending_idx').on(table.tenantId, table.status, table.expiresAt),
  // Index for created date (for cleanup jobs)
  createdIdx: index('dpf_agi_approvals_created_idx').on(table.createdAt),
}));

// Type exports
export type DpfAgiApproval = typeof dpfAgiApprovals.$inferSelect;
export type DpfAgiApprovalInsert = typeof dpfAgiApprovals.$inferInsert;
