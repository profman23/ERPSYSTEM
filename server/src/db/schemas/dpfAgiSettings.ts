import { pgTable, uuid, varchar, timestamp, text, integer, boolean, jsonb, real, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * DPF AGI Settings - Per-tenant AI configuration
 * Enterprise-grade with performance indexes
 */
export const dpfAgiSettings = pgTable('dpf_agi_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // One settings record per tenant

  // Feature Flags
  isEnabled: varchar('is_enabled', { length: 10 }).notNull().default('true'),
  allowVoiceCommands: varchar('allow_voice_commands', { length: 10 }).notNull().default('false'),
  allowAutonomousActions: varchar('allow_autonomous_actions', { length: 10 }).notNull().default('false'),
  requireApprovalForDestructive: varchar('require_approval_destructive', { length: 10 }).notNull().default('true'),

  // LLM Configuration
  defaultModel: varchar('default_model', { length: 100 }).notNull().default('claude-sonnet-4-20250514'),
  maxTokensPerRequest: integer('max_tokens_per_request').notNull().default(4096),
  temperature: real('temperature').notNull().default(0.7),

  // Usage Limits (0 = unlimited)
  dailyRequestLimit: integer('daily_request_limit').notNull().default(0),
  monthlyRequestLimit: integer('monthly_request_limit').notNull().default(0),

  // Default Access Level for new users
  defaultAgiLevel: varchar('default_agi_level', { length: 20 }).notNull().default('SUGGEST'),

  // Custom System Prompt (optional override)
  customSystemPrompt: text('custom_system_prompt'),

  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for tenant lookup
  tenantIdx: index('dpf_agi_settings_tenant_idx').on(table.tenantId),
}));

/**
 * System-wide AI Configuration (Platform level)
 * Single row table for global settings
 */
export const dpfSystemAiConfig = pgTable('dpf_system_ai_config', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Global Kill Switch
  isAiEnabled: varchar('is_ai_enabled', { length: 10 }).notNull().default('true'),

  // Model Configuration
  defaultModel: varchar('default_model', { length: 100 }).notNull().default('claude-sonnet-4-20250514'),
  fallbackModel: varchar('fallback_model', { length: 100 }).notNull().default('claude-sonnet-4-20250514'),

  // API Configuration (key stored in .env, this tracks if configured)
  apiKeyConfigured: varchar('api_key_configured', { length: 10 }).notNull().default('false'),

  // Feature Flags
  allowTenantCustomPrompts: varchar('allow_tenant_custom_prompts', { length: 10 }).notNull().default('true'),
  allowVoiceCommandsGlobally: varchar('allow_voice_globally', { length: 10 }).notNull().default('true'),

  // Global Limits
  maxTokensPerRequest: integer('max_tokens_per_request').notNull().default(4096),
  globalRateLimitPerMinute: integer('global_rate_limit_per_minute').notNull().default(100),

  // Monitoring & Logging
  enableDetailedLogging: varchar('enable_detailed_logging', { length: 10 }).notNull().default('true'),
  logRetentionDays: integer('log_retention_days').notNull().default(90),

  // Metadata
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type DpfAgiSettings = typeof dpfAgiSettings.$inferSelect;
export type DpfAgiSettingsInsert = typeof dpfAgiSettings.$inferInsert;
export type DpfSystemAiConfig = typeof dpfSystemAiConfig.$inferSelect;
export type DpfSystemAiConfigInsert = typeof dpfSystemAiConfig.$inferInsert;
