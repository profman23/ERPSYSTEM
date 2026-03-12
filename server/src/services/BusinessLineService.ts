/**
 * BusinessLine Service
 *
 * Handles business line CRUD with tenant isolation.
 * Follows BaseService pattern (see SpeciesService for reference).
 */

import { eq } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { businessLines } from '../db/schemas/businessLines';
import type { BusinessLine } from '../db/schemas/businessLines';
import type { CreateBusinessLineInput, UpdateBusinessLineInput, ListBusinessLineInput } from '../validations/businessLineValidation';

export class BusinessLineService extends BaseService {
  private static readonly TABLE = businessLines;
  private static readonly ENTITY_NAME = 'BusinessLine';

  static async list(tenantId: string, params: ListBusinessLineInput) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(businessLines.isActive, params.isActive === 'true'));
    }

    const { items, total } = await this.findMany<BusinessLine>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [businessLines.name, businessLines.code, businessLines.description],
      sortBy: businessLines.name,
      sortOrder: params.sortOrder || 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<BusinessLine>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateBusinessLineInput) {
    const code = input.code.toUpperCase();

    // Business rule: code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(businessLines.code, code));
    if (codeExists) {
      throw new ConflictError(`Business line with code '${code}' already exists`, 'ENTITY_CODE_EXISTS', { entity: 'BusinessLine', code });
    }

    return this.insertOne<BusinessLine>(tenantId, this.TABLE, { ...input, code });
  }

  static async update(tenantId: string, id: string, input: UpdateBusinessLineInput) {
    return this.updateById<BusinessLine>(tenantId, this.TABLE, id, input, this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }
}
