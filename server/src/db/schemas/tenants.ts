import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';

export const subscriptionPlanEnum = ['trial', 'standard', 'professional', 'enterprise'] as const;
export type SubscriptionPlan = typeof subscriptionPlanEnum[number];

export const tenantStatusEnum = ['active', 'inactive', 'suspended', 'pending'] as const;
export type TenantStatus = typeof tenantStatusEnum[number];

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  defaultLanguage: varchar('default_language', { length: 10 }).notNull().default('en'),
  country: varchar('country', { length: 100 }),
  countryCode: varchar('country_code', { length: 10 }),
  timezone: varchar('timezone', { length: 100 }).default('UTC'),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).notNull().default('trial'),
  subscriptionStartAt: timestamp('subscription_start_at'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  trialExpiresAt: timestamp('trial_expires_at'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  logoUrl: varchar('logo_url', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 50 }).default('#2563EB'),
  accentColor: varchar('accent_color', { length: 50 }).default('#8B5CF6'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  address: text('address'),
  allowedBusinessLines: integer('allowed_business_lines').notNull().default(5),
  allowedBranches: integer('allowed_branches').notNull().default(10),
  allowedUsers: integer('allowed_users').notNull().default(50),
  storageLimitGB: integer('storage_limit_gb').notNull().default(10),
  apiRateLimit: integer('api_rate_limit').notNull().default(1000),
  aiAssistantEnabled: boolean('ai_assistant_enabled').notNull().default(false),
  settings: jsonb('settings').default({}),
  dpfTemplateApplied: timestamp('dpf_template_applied'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
