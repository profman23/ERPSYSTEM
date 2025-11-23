import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { dpfModules } from './dpfModules';
import { dpfScreens } from './dpfScreens';

/**
 * DPF Actions - Auto-registered actions/buttons/operations
 * Every button, API endpoint, Socket.IO event auto-registers here
 */
export const dpfActions = pgTable('dpf_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  moduleId: uuid('module_id')
    .references(() => dpfModules.id)
    .notNull(),
  screenId: uuid('screen_id').references(() => dpfScreens.id), // Null for API/Socket actions
  actionCode: varchar('action_code', { length: 100 }).notNull(), // e.g., 'CREATE_PATIENT'
  actionName: varchar('action_name', { length: 255 }).notNull(),
  actionNameAr: varchar('action_name_ar', { length: 255 }),
  description: text('description'),
  descriptionAr: text('description_ar'),
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'CRUD', 'API', 'SOCKET', 'REPORT', 'EXPORT'
  actionCategory: varchar('action_category', { length: 50 }).notNull(), // 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'
  httpMethod: varchar('http_method', { length: 10 }), // 'GET', 'POST', 'PUT', 'DELETE'
  apiEndpoint: varchar('api_endpoint', { length: 500 }), // e.g., '/api/patients'
  socketEvent: varchar('socket_event', { length: 100 }), // e.g., 'patient:create'
  requiredScope: varchar('required_scope', { length: 50 }), // 'SYSTEM', 'TENANT', 'BUSINESS_LINE', 'BRANCH'
  requiredAgiLevel: varchar('required_agi_level', { length: 50 }), // AGI access level
  isDestructive: varchar('is_destructive', { length: 10 }).notNull().default('false'), // DELETE operations
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  voiceCommandsEn: jsonb('voice_commands_en'), // Array of English voice commands
  voiceCommandsAr: jsonb('voice_commands_ar'), // Array of Arabic voice commands
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
