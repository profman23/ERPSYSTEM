import { pgTable, uuid, varchar, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const subscriptionPlansEnum = ['trial', 'standard', 'professional', 'enterprise'] as const;
export type SubscriptionPlanType = typeof subscriptionPlansEnum[number];

export const subscriptionFeatures = pgTable('subscription_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  planCode: varchar('plan_code', { length: 50 }).notNull().unique(),
  planName: varchar('plan_name', { length: 100 }).notNull(),
  maxUsers: integer('max_users').notNull(),
  maxBranches: integer('max_branches').notNull(),
  maxBusinessLines: integer('max_business_lines').notNull(),
  storageLimitGB: integer('storage_limit_gb').notNull(),
  apiRateLimit: integer('api_rate_limit').notNull(),
  trialDays: integer('trial_days').default(0),
  features: jsonb('features').default({}),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, {
  maxUsers: number;
  maxBranches: number;
  maxBusinessLines: number;
  storageLimitGB: number;
  apiRateLimit: number;
  trialDays: number;
}> = {
  trial: {
    maxUsers: 3,
    maxBranches: 1,
    maxBusinessLines: 1,
    storageLimitGB: 1,
    apiRateLimit: 100,
    trialDays: 7,
  },
  standard: {
    maxUsers: 4,
    maxBranches: 2,
    maxBusinessLines: 2,
    storageLimitGB: 5,
    apiRateLimit: 500,
    trialDays: 0,
  },
  professional: {
    maxUsers: 6,
    maxBranches: 5,
    maxBusinessLines: 3,
    storageLimitGB: 20,
    apiRateLimit: 2000,
    trialDays: 0,
  },
  enterprise: {
    maxUsers: 999999,
    maxBranches: 999999,
    maxBusinessLines: 999999,
    storageLimitGB: 1000,
    apiRateLimit: 100000,
    trialDays: 0,
  },
};

export const MIDDLE_EAST_COUNTRIES = [
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', timezone: 'Africa/Cairo' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', timezone: 'Asia/Riyadh' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', timezone: 'Asia/Dubai' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', timezone: 'Asia/Kuwait' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', timezone: 'Asia/Qatar' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', timezone: 'Asia/Bahrain' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', timezone: 'Asia/Muscat' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', timezone: 'Asia/Amman' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', timezone: 'Asia/Beirut' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', timezone: 'Asia/Baghdad' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', timezone: 'Asia/Damascus' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', timezone: 'Asia/Aden' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', timezone: 'Asia/Gaza' },
] as const;

export type CountryCode = typeof MIDDLE_EAST_COUNTRIES[number]['code'];
