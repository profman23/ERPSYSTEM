/**
 * Species Service (Reference Feature Template)
 *
 * COPY THIS FILE for any new domain service.
 * Pattern:
 *   - Extends BaseService (gets findMany, findById, insertOne, updateById, softDelete)
 *   - Every method takes tenantId as first param (NEVER reads AsyncLocalStorage)
 *   - Business logic lives here (uniqueness checks, cross-entity validation, etc.)
 *   - Returns plain data (no HTTP concerns - that's the controller's job)
 */

import { eq } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { species } from '../db/schemas/species';
import type { Species } from '../db/schemas/species';
import type { CreateSpeciesInput, UpdateSpeciesInput, ListSpeciesParams } from '../validations/speciesValidation';

export class SpeciesService extends BaseService {
  private static readonly TABLE = species;
  private static readonly ENTITY_NAME = 'Species';

  static async list(tenantId: string, params: ListSpeciesParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(species.isActive, params.isActive === 'true'));
    }

    const { items, total } = await this.findMany<Species>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [species.name, species.nameAr, species.code],
      sortBy: species.name,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<Species>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateSpeciesInput) {
    // Business rule: code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(species.code, input.code));
    if (codeExists) {
      throw new ConflictError(`Species with code '${input.code}' already exists`, 'ENTITY_CODE_EXISTS', { entity: 'Species', code: input.code });
    }

    return this.auditableInsertOne<Species>(tenantId, this.TABLE, input, 'species');
  }

  static async update(tenantId: string, id: string, input: UpdateSpeciesInput) {
    // If updating code, check uniqueness
    if (input.code) {
      const existing = await this.findByIdOrNull<Species>(tenantId, this.TABLE, id);
      if (existing && existing.code !== input.code) {
        const codeExists = await this.exists(tenantId, this.TABLE, eq(species.code, input.code));
        if (codeExists) {
          throw new ConflictError(`Species with code '${input.code}' already exists`, 'ENTITY_CODE_EXISTS', { entity: 'Species', code: input.code });
        }
      }
    }

    return this.auditableUpdateById<Species>(tenantId, this.TABLE, id, input, 'species', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'species', this.ENTITY_NAME);
  }
}
