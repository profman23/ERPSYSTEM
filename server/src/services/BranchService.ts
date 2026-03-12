/**
 * Branch Service
 *
 * Handles branch CRUD with tenant isolation.
 * Follows BaseService pattern (see SpeciesService for reference).
 */

import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { branches } from '../db/schemas/branches';
import type { Branch } from '../db/schemas/branches';
import { WarehouseService } from './WarehouseService';
import { DocumentNumberSeriesService } from './DocumentNumberSeriesService';
import type { CreateBranchInput, UpdateBranchInput, ListBranchInput } from '../validations/branchValidation';

export class BranchService extends BaseService {
  private static readonly TABLE = branches;
  private static readonly ENTITY_NAME = 'Branch';

  static async list(tenantId: string, params: ListBranchInput) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(branches.isActive, params.isActive === 'true'));
    }

    if (params.businessLineId) {
      filters.push(eq(branches.businessLineId, params.businessLineId));
    }

    const { items, total } = await this.findMany<Branch>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [branches.name, branches.code, branches.city],
      sortBy: branches.name,
      sortOrder: params.sortOrder || 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<Branch>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateBranchInput) {
    // Auto-generate code if not provided in body
    const code = (input as any).code
      ? (input as any).code.toUpperCase()
      : `BR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Business rule: code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(branches.code, code));
    if (codeExists) {
      throw new ConflictError(`Branch with code '${code}' already exists`, 'ENTITY_CODE_EXISTS', { entity: 'Branch', code });
    }

    // Determine branch sequence for document number series
    const branchSequence = await DocumentNumberSeriesService.getNextBranchSequence(tenantId);

    // Atomic: create branch + default warehouse + document number series
    return this.transaction(async (tx) => {
      const [branch] = await tx.insert(branches)
        .values({ ...input, code, tenantId })
        .returning();

      // Auto-create default warehouse for this branch
      await WarehouseService.createDefaultForBranch(
        tx, tenantId, branch.id, code, branch.name,
      );

      // Auto-seed 7 document number series for this branch
      await DocumentNumberSeriesService.seedForBranch(
        tx, tenantId, branch.id, branchSequence,
      );

      return branch as Branch;
    });
  }

  static async update(tenantId: string, id: string, input: UpdateBranchInput) {
    return this.updateById<Branch>(tenantId, this.TABLE, id, input, this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }
}
