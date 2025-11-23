import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * DPF Voice Logs - Audit trail for voice commands
 * Tracks all voice-activated permission operations
 */
export const dpfVoiceLogs = pgTable('dpf_voice_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  voiceCommand: text('voice_command').notNull(), // Transcribed voice command
  detectedLanguage: varchar('detected_language', { length: 10 }), // 'en' or 'ar'
  confidence: varchar('confidence', { length: 50 }), // Speech recognition confidence score
  recognizedIntent: varchar('recognized_intent', { length: 255 }), // What was understood
  mappedAction: varchar('mapped_action', { length: 100 }), // Mapped DPF action
  permissionRequired: varchar('permission_required', { length: 100 }), // Permission code
  permissionGranted: varchar('permission_granted', { length: 10 }), // 'true' or 'false'
  executionStatus: varchar('execution_status', { length: 50 }), // 'SUCCESS', 'FAILED', 'DENIED'
  failureReason: text('failure_reason'),
  audioFileUrl: varchar('audio_file_url', { length: 500 }), // Optional: stored audio file
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
