/**
 * Patient (Pet / Animal) Validation Schemas
 *
 * Pattern:
 *   - createSchema: validates POST body (with refine for age mode)
 *   - updateSchema: validates PUT body (all fields optional via .partial())
 *   - listSchema:   validates GET query params (search, filters, page, limit)
 */

import { z } from 'zod';

const patientBaseSchema = z.object({
  clientId: z.string().uuid('Client (owner) is required'),
  speciesId: z.string().uuid('Species is required'),
  breedId: z.string().uuid('Invalid breed').optional().nullable(),
  crossBreedId: z.string().uuid('Invalid cross breed').optional().nullable(),
  name: z.string().min(1, 'Pet name is required').max(255, 'Pet name must be 255 characters or less'),
  nameAr: z.string().max(255, 'Arabic pet name must be 255 characters or less').optional(),
  gender: z.enum(['male', 'female', 'unknown'], { message: 'Gender must be male, female, or unknown' }).default('unknown'),
  reproductiveStatus: z.enum(['intact', 'neutered', 'spayed'], { message: 'Reproductive status must be intact, neutered, or spayed' }).default('intact'),
  color: z.string().max(100, 'Color must be 100 characters or less').optional(),
  distinctiveMarks: z.string().optional(),
  dateOfBirth: z.string().optional().nullable().refine(
    (val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d <= new Date();
    },
    { message: 'Date of birth cannot be in the future' }
  ),
  ageYears: z.coerce.number().int().min(0, 'Age years cannot be negative').max(100).optional().nullable(),
  ageMonths: z.coerce.number().int().min(0, 'Age months cannot be negative').max(11).optional().nullable(),
  ageDays: z.coerce.number().int().min(0, 'Age days cannot be negative').max(30).optional().nullable(),
  internalNotes: z.string().optional(),
  passportSeries: z.string().max(100, 'Passport series must be 100 characters or less').optional(),
  insuranceNumber: z.string().max(100, 'Insurance number must be 100 characters or less').optional(),
  microchipId: z.string().max(100, 'Microchip ID must be 100 characters or less').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createPatientSchema = patientBaseSchema.refine(
  (data) => {
    const hasDateOfBirth = !!data.dateOfBirth;
    const hasEstimatedAge = (data.ageYears != null && data.ageYears > 0)
      || (data.ageMonths != null && data.ageMonths > 0)
      || (data.ageDays != null && data.ageDays > 0);
    return hasDateOfBirth || hasEstimatedAge;
  },
  { message: 'Either date of birth or estimated age must be provided', path: ['dateOfBirth'] }
);

export const updatePatientSchema = patientBaseSchema.partial();

export const listPatientsSchema = z.object({
  search: z.string().optional(),
  clientId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  breedId: z.string().uuid().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsParams = z.infer<typeof listPatientsSchema>;
