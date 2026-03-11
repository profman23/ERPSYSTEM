/**
 * Unit of Measure Service
 *
 * Extends BaseService (static methods, tenant isolation via first param).
 * Features:
 *   - Code uniqueness per tenant (service + DB unique index)
 *   - Optimistic locking via `version` column
 *   - Simple dictionary: code + name + symbol (conversion at Item level)
 */

import { eq } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { unitOfMeasures } from '../db/schemas/unitOfMeasures';
import type { UnitOfMeasure } from '../db/schemas/unitOfMeasures';
import type {
  CreateUnitOfMeasureInput,
  UpdateUnitOfMeasureInput,
  ListUnitOfMeasuresParams,
} from '../validations/unitOfMeasureValidation';

export class UnitOfMeasureService extends BaseService {
  private static readonly TABLE = unitOfMeasures;
  private static readonly ENTITY_NAME = 'UnitOfMeasure';

  static async list(tenantId: string, params: ListUnitOfMeasuresParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(unitOfMeasures.isActive, params.isActive === 'true'));
    }

    const { items, total } = await this.findMany<UnitOfMeasure>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [unitOfMeasures.code, unitOfMeasures.name, unitOfMeasures.nameAr, unitOfMeasures.symbol],
      sortBy: unitOfMeasures.code,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<UnitOfMeasure>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateUnitOfMeasureInput) {
    // Code uniqueness per tenant
    const codeExists = await this.exists(
      tenantId,
      this.TABLE,
      eq(unitOfMeasures.code, input.code),
    );
    if (codeExists) {
      throw new ConflictError(`Unit of measure '${input.code}' already exists`);
    }

    return this.auditableInsertOne<UnitOfMeasure>(tenantId, this.TABLE, input, 'unit_of_measure');
  }

  static async update(tenantId: string, id: string, input: UpdateUnitOfMeasureInput) {
    // Fetch existing record for version check
    const existing = await this.findById<UnitOfMeasure>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Optimistic locking
    if (existing.version !== input.version) {
      throw new ConflictError('This unit of measure was modified by another user. Please refresh and try again.');
    }

    // If updating code, check uniqueness
    if (input.code && input.code !== existing.code) {
      const codeExists = await this.exists(
        tenantId,
        this.TABLE,
        eq(unitOfMeasures.code, input.code),
      );
      if (codeExists) {
        throw new ConflictError(`Unit of measure '${input.code}' already exists`);
      }
    }

    // Build update data
    const { version, ...updateFields } = input;
    const dbInput: Record<string, unknown> = {
      ...updateFields,
      version: existing.version + 1,
    };

    return this.auditableUpdateById<UnitOfMeasure>(tenantId, this.TABLE, id, dbInput, 'unit_of_measure', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'unit_of_measure', this.ENTITY_NAME);
  }
}
