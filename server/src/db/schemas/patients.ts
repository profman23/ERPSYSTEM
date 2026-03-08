/**
 * Patients Schema (Pets / Animals)
 *
 * The core clinical entity. Each patient is a pet belonging to a client (owner).
 * Linked to species and optionally to a breed and cross-breed.
 * Supports two age input methods: exact date of birth OR estimated age (years/months/days).
 * Code is auto-generated in the service layer (PAT-000001).
 *
 * Relations: see ./relations.ts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, date, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clients } from './clients';
import { species } from './species';
import { breeds } from './breeds';

export const genderEnum = ['male', 'female', 'unknown'] as const;
export type Gender = (typeof genderEnum)[number];

export const reproductiveStatusEnum = ['intact', 'neutered', 'spayed'] as const;
export type ReproductiveStatus = (typeof reproductiveStatusEnum)[number];

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  speciesId: uuid('species_id').references(() => species.id, { onDelete: 'cascade' }).notNull(),
  breedId: uuid('breed_id').references(() => breeds.id, { onDelete: 'set null' }),
  crossBreedId: uuid('cross_breed_id').references(() => breeds.id, { onDelete: 'set null' }),
  code: varchar('code', { length: 50 }).notNull(),            // Auto-generated: PAT-000001
  name: varchar('name', { length: 255 }).notNull(),            // Pet name (English)
  nameAr: varchar('name_ar', { length: 255 }),                 // Pet name (Arabic)
  gender: varchar('gender', { length: 20 }).notNull().default('unknown'),
  reproductiveStatus: varchar('reproductive_status', { length: 20 }).default('intact'),
  color: varchar('color', { length: 100 }),
  distinctiveMarks: text('distinctive_marks'),
  dateOfBirth: date('date_of_birth'),                          // Exact birthdate (option 1)
  ageYears: integer('age_years'),                              // Estimated age (option 2)
  ageMonths: integer('age_months'),
  ageDays: integer('age_days'),
  internalNotes: text('internal_notes'),                       // Always private
  passportSeries: varchar('passport_series', { length: 100 }),
  insuranceNumber: varchar('insurance_number', { length: 100 }),
  microchipId: varchar('microchip_id', { length: 100 }),
  metadata: jsonb('metadata').default({}),                     // Extensible data
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIsActiveIdx: index('patients_tenant_is_active_idx').on(table.tenantId, table.isActive),
  tenantCodeIdx: index('patients_tenant_code_idx').on(table.tenantId, table.code),
  clientIdIdx: index('patients_client_id_idx').on(table.clientId),
  speciesIdIdx: index('patients_species_id_idx').on(table.speciesId),
  breedIdIdx: index('patients_breed_id_idx').on(table.breedId),
  crossBreedIdIdx: index('patients_cross_breed_id_idx').on(table.crossBreedId),
  microchipIdx: index('patients_microchip_idx').on(table.tenantId, table.microchipId),
}));

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
