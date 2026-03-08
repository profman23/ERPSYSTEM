import { pgTable, uuid, varchar, timestamp, integer, real, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * DPF AGI Usage - Track AI usage for analytics and billing
 * Enterprise-grade with time-series optimization
 */
export const dpfAgiUsage = pgTable('dpf_agi_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Request info
  requestType: varchar('request_type', { length: 20 }).notNull(), // CHAT, VOICE, ACTION
  requestId: uuid('request_id'), // Correlation ID for tracing

  // Token usage
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),

  // Processing info
  model: varchar('model', { length: 100 }).notNull(),
  processingTimeMs: integer('processing_time_ms').notNull().default(0),

  // Routing info
  wasPatternMatched: varchar('was_pattern_matched', { length: 10 }).notNull().default('false'), // Handled by pattern matching
  wasClaude: varchar('was_claude', { length: 10 }).notNull().default('false'), // Sent to Claude API

  // Cost tracking (in USD cents for precision)
  estimatedCostCents: integer('estimated_cost_cents').notNull().default(0),

  // Context
  pageContext: varchar('page_context', { length: 255 }),
  moduleContext: varchar('module_context', { length: 100 }),
  locale: varchar('locale', { length: 5 }).default('en'),

  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Index for tenant daily aggregation
  tenantDailyIdx: index('dpf_agi_usage_tenant_daily_idx').on(table.tenantId, table.createdAt),
  // Index for user usage
  userIdx: index('dpf_agi_usage_user_idx').on(table.userId, table.createdAt),
  // Index for model analytics
  modelIdx: index('dpf_agi_usage_model_idx').on(table.model, table.createdAt),
  // Index for time-based cleanup
  createdIdx: index('dpf_agi_usage_created_idx').on(table.createdAt),
}));

/**
 * DPF AGI Usage Daily Aggregates - Pre-computed daily stats
 * For fast dashboard queries without scanning usage table
 */
export const dpfAgiUsageDailyAggregates = pgTable('dpf_agi_usage_daily_aggregates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),

  // Date (stored as date string YYYY-MM-DD for easy grouping)
  dateKey: varchar('date_key', { length: 10 }).notNull(), // '2024-12-24'

  // Aggregated counts
  totalRequests: integer('total_requests').notNull().default(0),
  chatRequests: integer('chat_requests').notNull().default(0),
  voiceRequests: integer('voice_requests').notNull().default(0),
  actionRequests: integer('action_requests').notNull().default(0),

  // Token totals
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),

  // Cost totals (in USD cents)
  totalCostCents: integer('total_cost_cents').notNull().default(0),

  // Performance metrics
  avgProcessingTimeMs: integer('avg_processing_time_ms').notNull().default(0),
  patternMatchCount: integer('pattern_match_count').notNull().default(0),
  claudeCallCount: integer('claude_call_count').notNull().default(0),

  // Unique users
  uniqueUsers: integer('unique_users').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint for tenant + date
  tenantDateUnique: index('dpf_agi_usage_daily_tenant_date_idx').on(table.tenantId, table.dateKey),
}));

// Type exports
export type DpfAgiUsage = typeof dpfAgiUsage.$inferSelect;
export type DpfAgiUsageInsert = typeof dpfAgiUsage.$inferInsert;
export type DpfAgiUsageDailyAggregate = typeof dpfAgiUsageDailyAggregates.$inferSelect;
export type DpfAgiUsageDailyAggregateInsert = typeof dpfAgiUsageDailyAggregates.$inferInsert;
