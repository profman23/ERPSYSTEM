/**
 * Breed Service
 *
 * Manages animal breeds linked to species.
 * Extends BaseService for automatic tenant isolation.
 */

import { eq } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, NotFoundError } from '../core/errors';
import { breeds } from '../db/schemas/breeds';
import { species } from '../db/schemas/species';
import type { Breed } from '../db/schemas/breeds';
import type { CreateBreedInput, UpdateBreedInput, ListBreedsParams } from '../validations/breedValidation';

export class BreedService extends BaseService {
  private static readonly TABLE = breeds;
  private static readonly ENTITY_NAME = 'Breed';

  static async list(tenantId: string, params: ListBreedsParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(breeds.isActive, params.isActive === 'true'));
    }

    if (params.speciesId) {
      filters.push(eq(breeds.speciesId, params.speciesId));
    }

    const { items, total } = await this.findMany<Breed>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [breeds.name, breeds.nameAr, breeds.code],
      sortBy: breeds.name,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<Breed>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateBreedInput) {
    // Validate species exists in tenant
    const speciesExists = await this.exists(tenantId, species, eq(species.id, input.speciesId));
    if (!speciesExists) {
      throw new NotFoundError('Species', input.speciesId);
    }

    // Code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(breeds.code, input.code));
    if (codeExists) {
      throw new ConflictError(`Breed with code '${input.code}' already exists`);
    }

    return this.auditableInsertOne<Breed>(tenantId, this.TABLE, input, 'breed');
  }

  static async update(tenantId: string, id: string, input: UpdateBreedInput) {
    if (input.speciesId) {
      const speciesExists = await this.exists(tenantId, species, eq(species.id, input.speciesId));
      if (!speciesExists) {
        throw new NotFoundError('Species', input.speciesId);
      }
    }

    if (input.code) {
      const existing = await this.findByIdOrNull<Breed>(tenantId, this.TABLE, id);
      if (existing && existing.code !== input.code) {
        const codeExists = await this.exists(tenantId, this.TABLE, eq(breeds.code, input.code));
        if (codeExists) {
          throw new ConflictError(`Breed with code '${input.code}' already exists`);
        }
      }
    }

    return this.auditableUpdateById<Breed>(tenantId, this.TABLE, id, input, 'breed', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'breed', this.ENTITY_NAME);
  }
}
