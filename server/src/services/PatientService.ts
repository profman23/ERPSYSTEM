/**
 * Patient (Pet / Animal) Service
 *
 * Core clinical entity. Manages patients with auto-generated codes (PAT-000001).
 * Custom JOIN queries for denormalized list data.
 * Extends BaseService for automatic tenant isolation.
 */

import { eq, and, or, ilike, sql, desc, asc, SQL } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { NotFoundError, ConflictError } from '../core/errors';
import { patients } from '../db/schemas/patients';
import { clients } from '../db/schemas/clients';
import { species } from '../db/schemas/species';
import { breeds } from '../db/schemas/breeds';
import type { Patient } from '../db/schemas/patients';
import type { CreatePatientInput, UpdatePatientInput, ListPatientsParams } from '../validations/patientValidation';

export class PatientService extends BaseService {
  private static readonly TABLE = patients;
  private static readonly ENTITY_NAME = 'Patient';

  /**
   * Generate next patient code: PAT-000001, PAT-000002, etc.
   */
  private static async generateCode(tenantId: string): Promise<string> {
    const total = await this.count(tenantId, this.TABLE);
    const nextNum = total + 1;
    return `PAT-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * List patients with denormalized data (species name, breed name, owner name).
   */
  static async list(tenantId: string, params: ListPatientsParams) {
    const conditions: SQL[] = [eq(patients.tenantId, tenantId)];

    if (params.isActive !== undefined) {
      conditions.push(eq(patients.isActive, params.isActive === 'true'));
    }
    if (params.clientId) {
      conditions.push(eq(patients.clientId, params.clientId));
    }
    if (params.speciesId) {
      conditions.push(eq(patients.speciesId, params.speciesId));
    }
    if (params.breedId) {
      conditions.push(eq(patients.breedId, params.breedId));
    }
    if (params.gender) {
      conditions.push(eq(patients.gender, params.gender));
    }
    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(patients.name, pattern),
          ilike(patients.nameAr!, pattern),
          ilike(patients.code, pattern),
          ilike(patients.microchipId!, pattern),
        ) as SQL
      );
    }

    const where = and(...conditions);
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Count query
    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(where);

    // Data query with JOINs for denormalized output
    const items = await this.db
      .select({
        id: patients.id,
        code: patients.code,
        name: patients.name,
        nameAr: patients.nameAr,
        gender: patients.gender,
        reproductiveStatus: patients.reproductiveStatus,
        color: patients.color,
        dateOfBirth: patients.dateOfBirth,
        ageYears: patients.ageYears,
        ageMonths: patients.ageMonths,
        ageDays: patients.ageDays,
        microchipId: patients.microchipId,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
        clientId: patients.clientId,
        speciesId: patients.speciesId,
        breedId: patients.breedId,
        crossBreedId: patients.crossBreedId,
        // Denormalized fields
        ownerName: sql<string>`concat(${clients.firstName}, ' ', ${clients.lastName})`,
        clientCode: clients.code,
        speciesName: species.name,
        breedName: breeds.name,
      })
      .from(patients)
      .leftJoin(clients, eq(patients.clientId, clients.id))
      .leftJoin(species, eq(patients.speciesId, species.id))
      .leftJoin(breeds, eq(patients.breedId, breeds.id))
      .where(where)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, total: Number(total), page, limit };
  }

  /**
   * Get a single patient with full related data.
   */
  static async getById(tenantId: string, id: string) {
    const results = await this.db
      .select({
        id: patients.id,
        tenantId: patients.tenantId,
        code: patients.code,
        name: patients.name,
        nameAr: patients.nameAr,
        gender: patients.gender,
        reproductiveStatus: patients.reproductiveStatus,
        color: patients.color,
        distinctiveMarks: patients.distinctiveMarks,
        dateOfBirth: patients.dateOfBirth,
        ageYears: patients.ageYears,
        ageMonths: patients.ageMonths,
        ageDays: patients.ageDays,
        internalNotes: patients.internalNotes,
        passportSeries: patients.passportSeries,
        insuranceNumber: patients.insuranceNumber,
        microchipId: patients.microchipId,
        metadata: patients.metadata,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        clientId: patients.clientId,
        speciesId: patients.speciesId,
        breedId: patients.breedId,
        crossBreedId: patients.crossBreedId,
        // Denormalized
        ownerFirstName: clients.firstName,
        ownerLastName: clients.lastName,
        ownerEmail: clients.email,
        ownerPhone: clients.phone,
        speciesName: species.name,
        breedName: breeds.name,
      })
      .from(patients)
      .leftJoin(clients, eq(patients.clientId, clients.id))
      .leftJoin(species, eq(patients.speciesId, species.id))
      .leftJoin(breeds, eq(patients.breedId, breeds.id))
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, id)))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundError(this.ENTITY_NAME, id);
    }

    return results[0];
  }

  static async create(tenantId: string, input: CreatePatientInput) {
    // Validate clientId belongs to tenant
    const clientExists = await this.exists(tenantId, clients, eq(clients.id, input.clientId));
    if (!clientExists) {
      throw new NotFoundError('Client', input.clientId);
    }

    // Validate speciesId belongs to tenant
    const speciesExists = await this.exists(tenantId, species, eq(species.id, input.speciesId));
    if (!speciesExists) {
      throw new NotFoundError('Species', input.speciesId);
    }

    // Validate breedId belongs to tenant (if provided)
    if (input.breedId) {
      const breedExists = await this.exists(tenantId, breeds, eq(breeds.id, input.breedId));
      if (!breedExists) {
        throw new NotFoundError('Breed', input.breedId);
      }
    }

    // Validate crossBreedId belongs to tenant (if provided)
    if (input.crossBreedId) {
      const crossBreedExists = await this.exists(tenantId, breeds, eq(breeds.id, input.crossBreedId));
      if (!crossBreedExists) {
        throw new NotFoundError('Cross Breed', input.crossBreedId);
      }
    }

    const code = await this.generateCode(tenantId);
    return this.insertOne<Patient>(tenantId, this.TABLE, { ...input, code });
  }

  static async update(tenantId: string, id: string, input: UpdatePatientInput) {
    // Validate FKs if provided in update
    if (input.clientId) {
      const clientExists = await this.exists(tenantId, clients, eq(clients.id, input.clientId));
      if (!clientExists) throw new NotFoundError('Client', input.clientId);
    }
    if (input.speciesId) {
      const speciesExists = await this.exists(tenantId, species, eq(species.id, input.speciesId));
      if (!speciesExists) throw new NotFoundError('Species', input.speciesId);
    }
    if (input.breedId) {
      const breedExists = await this.exists(tenantId, breeds, eq(breeds.id, input.breedId));
      if (!breedExists) throw new NotFoundError('Breed', input.breedId);
    }
    if (input.crossBreedId) {
      const crossBreedExists = await this.exists(tenantId, breeds, eq(breeds.id, input.crossBreedId));
      if (!crossBreedExists) throw new NotFoundError('Cross Breed', input.crossBreedId);
    }

    return this.updateById<Patient>(tenantId, this.TABLE, id, input, this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }
}
