/**
 * Client (Pet Owner) Service
 *
 * Manages pet owners with auto-generated codes (CLT-000001).
 * Extends BaseService for automatic tenant isolation.
 */

import { eq, sql } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { clients } from '../db/schemas/clients';
import type { Client } from '../db/schemas/clients';
import type { CreateClientInput, UpdateClientInput, ListClientsParams } from '../validations/clientValidation';

export class ClientService extends BaseService {
  private static readonly TABLE = clients;
  private static readonly ENTITY_NAME = 'Client';

  /**
   * Generate next client code: CLT-000001, CLT-000002, etc.
   */
  private static async generateCode(tenantId: string): Promise<string> {
    const total = await this.count(tenantId, this.TABLE);
    const nextNum = total + 1;
    return `CLT-${String(nextNum).padStart(6, '0')}`;
  }

  static async list(tenantId: string, params: ListClientsParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(clients.isActive, params.isActive === 'true'));
    }

    const { items, total } = await this.findMany<Client>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [clients.firstName, clients.lastName, clients.email, clients.code, clients.phone],
      sortBy: clients.createdAt,
      sortOrder: 'desc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<Client>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateClientInput) {
    // Check email uniqueness if provided
    if (input.email) {
      const emailExists = await this.exists(tenantId, this.TABLE, eq(clients.email, input.email));
      if (emailExists) {
        throw new ConflictError(`Client with email '${input.email}' already exists`);
      }
    }

    const code = await this.generateCode(tenantId);
    return this.auditableInsertOne<Client>(tenantId, this.TABLE, { ...input, code }, 'client');
  }

  static async update(tenantId: string, id: string, input: UpdateClientInput) {
    if (input.email) {
      const existing = await this.findByIdOrNull<Client>(tenantId, this.TABLE, id);
      if (existing && existing.email !== input.email) {
        const emailExists = await this.exists(tenantId, this.TABLE, eq(clients.email, input.email));
        if (emailExists) {
          throw new ConflictError(`Client with email '${input.email}' already exists`);
        }
      }
    }

    return this.auditableUpdateById<Client>(tenantId, this.TABLE, id, input, 'client', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'client', this.ENTITY_NAME);
  }

  /**
   * Count patients belonging to a client (for client detail page).
   */
  static async countPatients(tenantId: string, clientId: string): Promise<number> {
    // Import here to avoid circular dependency
    const { patients } = await import('../db/schemas/patients');
    return this.count(tenantId, patients, eq(patients.clientId, clientId));
  }
}
