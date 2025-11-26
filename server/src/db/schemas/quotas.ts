/**
 * Quotas Schema
 * Multi-tenant resource quotas and usage tracking
 */

import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const tenantQuotas = pgTable('tenant_quotas', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull().unique(),
  planTier: varchar('plan_tier', { length: 50 }).notNull().default('basic'),
  maxUsers: integer('max_users').notNull().default(10),
  maxBranches: integer('max_branches').notNull().default(1),
  maxPatients: integer('max_patients').notNull().default(1000),
  maxAppointmentsPerDay: integer('max_appointments_per_day').notNull().default(50),
  maxApiRequestsPerDay: integer('max_api_requests_per_day').notNull().default(10000),
  maxStorageMb: integer('max_storage_mb').notNull().default(1000),
  customLimits: jsonb('custom_limits').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const quotaUsage = pgTable('quota_usage', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  currentUsage: integer('current_usage').notNull().default(0),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  metadata: jsonb('metadata').default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rateLimitBuckets = pgTable('rate_limit_buckets', {
  id: varchar('id', { length: 36 }).primaryKey(),
  bucketKey: varchar('bucket_key', { length: 255 }).notNull().unique(),
  bucketType: varchar('bucket_type', { length: 50 }).notNull(),
  tokens: integer('tokens').notNull().default(0),
  lastRefill: timestamp('last_refill').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

export type TenantQuota = typeof tenantQuotas.$inferSelect;
export type NewTenantQuota = typeof tenantQuotas.$inferInsert;
export type QuotaUsage = typeof quotaUsage.$inferSelect;
export type NewQuotaUsage = typeof quotaUsage.$inferInsert;
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
