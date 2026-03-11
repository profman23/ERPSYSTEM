/**
 * Warehouse Service
 *
 * Handles warehouse CRUD with tenant isolation.
 * Business rules:
 *   - code must be unique per tenant
 *   - isDefault: only one per branch (auto-toggle in transaction)
 *   - Cannot soft-delete the default warehouse unless another exists
 */

import { eq, and } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, NotFoundError } from '../core/errors';
import { auditService } from '../core/audit/auditService';
import { db } from '../db';
import { warehouses } from '../db/schemas/warehouses';
import type { Warehouse } from '../db/schemas/warehouses';
import { chartOfAccounts } from '../db/schemas/chartOfAccounts';
import { branches } from '../db/schemas/branches';
import type { CreateWarehouseInput, UpdateWarehouseInput, ListWarehouseParams } from '../validations/warehouseValidation';

export class WarehouseService extends BaseService {
  private static readonly TABLE = warehouses;
  private static readonly ENTITY_NAME = 'Warehouse';

  static async list(tenantId: string, params: ListWarehouseParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(warehouses.isActive, params.isActive === 'true'));
    }

    if (params.branchId) {
      filters.push(eq(warehouses.branchId, params.branchId));
    }

    if (params.warehouseType) {
      filters.push(eq(warehouses.warehouseType, params.warehouseType));
    }

    const { items, total } = await this.findMany<Warehouse>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [warehouses.name, warehouses.code],
      sortBy: warehouses.name,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async listByBranch(tenantId: string, branchId: string) {
    const { items, total } = await this.findMany<Warehouse>(tenantId, this.TABLE, {
      page: 1,
      limit: 100,
      filters: [eq(warehouses.branchId, branchId)],
      sortBy: warehouses.name,
      sortOrder: 'asc',
    });

    return { items, total };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<Warehouse>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  /** SAP B1 standard default account codes for warehouse GL determination */
  private static readonly WAREHOUSE_DEFAULT_ACCOUNTS = {
    inventory:       '1141',  // Medication Inventory (ASSET)
    cogs:            '5110',  // Medication Cost (EXPENSE — COGS)
    priceDifference: '5120',  // Supplies Cost (EXPENSE — price variance)
    revenue:         '4210',  // Medication Sales (REVENUE — product sales)
    expense:         '5900',  // Other Expenses (EXPENSE — operating)
  } as const;

  /**
   * Finds a postable account by its specific code within the tenant's COA.
   * Uses the composite index (tenant_id, code) for fast lookup.
   */
  private static async findAccountByCode(tenantId: string, code: string): Promise<string | null> {
    const [account] = await db.select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.tenantId, tenantId),
        eq(chartOfAccounts.code, code),
        eq(chartOfAccounts.isPostable, true),
        eq(chartOfAccounts.isActive, true),
      ))
      .limit(1);
    return account?.id ?? null;
  }

  static async create(tenantId: string, input: CreateWarehouseInput) {
    // Business rule: code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(warehouses.code, input.code));
    if (codeExists) {
      throw new ConflictError(`Warehouse with code '${input.code}' already exists`);
    }

    // Auto-assign default GL accounts if not provided (SAP B1 standard codes)
    const defaults = this.WAREHOUSE_DEFAULT_ACCOUNTS;
    if (!input.inventoryAccountId) {
      input.inventoryAccountId = await this.findAccountByCode(tenantId, defaults.inventory);
    }
    if (!input.cogsAccountId) {
      input.cogsAccountId = await this.findAccountByCode(tenantId, defaults.cogs);
    }
    if (!input.priceDifferenceAccountId) {
      input.priceDifferenceAccountId = await this.findAccountByCode(tenantId, defaults.priceDifference);
    }
    if (!input.revenueAccountId) {
      input.revenueAccountId = await this.findAccountByCode(tenantId, defaults.revenue);
    }
    if (!input.expenseAccountId) {
      input.expenseAccountId = await this.findAccountByCode(tenantId, defaults.expense);
    }

    // If isDefault, toggle off other defaults in same branch (transactional)
    if (input.isDefault) {
      const result = await this.transaction(async (tx) => {
        await tx.update(warehouses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(
            eq(warehouses.tenantId, tenantId),
            eq(warehouses.branchId, input.branchId),
            eq(warehouses.isDefault, true),
            eq(warehouses.isActive, true),
          ));

        const [created] = await tx.insert(warehouses)
          .values({ ...input, tenantId })
          .returning();
        return created as Warehouse;
      });
      auditService.log({ action: 'create', resourceType: 'warehouse', resourceId: result.id, newData: result as Record<string, unknown> });
      return result;
    }

    return this.auditableInsertOne<Warehouse>(tenantId, this.TABLE, input, 'warehouse');
  }

  static async update(tenantId: string, id: string, input: UpdateWarehouseInput) {
    // If updating code, check uniqueness
    if (input.code) {
      const existing = await this.findByIdOrNull<Warehouse>(tenantId, this.TABLE, id);
      if (existing && existing.code !== input.code) {
        const codeExists = await this.exists(tenantId, this.TABLE, eq(warehouses.code, input.code));
        if (codeExists) {
          throw new ConflictError(`Warehouse with code '${input.code}' already exists`);
        }
      }
    }

    // If setting isDefault to true, toggle off other defaults in same branch
    if (input.isDefault === true) {
      const existing = await this.findById<Warehouse>(tenantId, this.TABLE, id, this.ENTITY_NAME);

      const result = await this.transaction(async (tx) => {
        await tx.update(warehouses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(
            eq(warehouses.tenantId, tenantId),
            eq(warehouses.branchId, input.branchId || existing.branchId),
            eq(warehouses.isDefault, true),
            eq(warehouses.isActive, true),
          ));

        const [updated] = await tx.update(warehouses)
          .set({ ...input, updatedAt: new Date() })
          .where(and(
            eq(warehouses.id, id),
            eq(warehouses.tenantId, tenantId),
          ))
          .returning();
        return updated as Warehouse;
      });
      auditService.log({ action: 'update', resourceType: 'warehouse', resourceId: id, oldData: existing as Record<string, unknown>, newData: result as Record<string, unknown> });
      return result;
    }

    return this.auditableUpdateById<Warehouse>(tenantId, this.TABLE, id, input, 'warehouse', this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    const warehouse = await this.findById<Warehouse>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Cannot delete default warehouse
    if (warehouse.isDefault) {
      // Check if there are other active warehouses in the same branch
      const otherCount = await this.count(tenantId, this.TABLE, and(
        eq(warehouses.branchId, warehouse.branchId),
        eq(warehouses.isActive, true),
      ));

      if (otherCount <= 1) {
        throw new ConflictError('Cannot delete the only warehouse for this branch');
      }

      throw new ConflictError('Cannot delete the default warehouse. Set another warehouse as default first.');
    }

    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'warehouse', this.ENTITY_NAME);
  }

  static async toggleStatus(tenantId: string, id: string) {
    const warehouse = await this.findById<Warehouse>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Cannot deactivate the default warehouse
    if (warehouse.isDefault && warehouse.isActive) {
      throw new ConflictError('Cannot deactivate the default warehouse. Set another warehouse as default first.');
    }

    const newStatus = !warehouse.isActive;
    await this.updateById<Warehouse>(tenantId, this.TABLE, id, { isActive: newStatus }, this.ENTITY_NAME);
    return { id, isActive: newStatus };
  }

  /**
   * Creates a default warehouse for a newly created branch.
   * Called within a transaction from BranchService.
   * Auto-assigns GL accounts from the tenant's Chart of Accounts.
   */
  static async createDefaultForBranch(
    tx: typeof db,
    tenantId: string,
    branchId: string,
    branchCode: string,
    branchName: string,
  ) {
    // Resolve default GL accounts from tenant's COA by SAP B1 standard codes (parallel)
    const d = this.WAREHOUSE_DEFAULT_ACCOUNTS;
    const [inventoryAccountId, cogsAccountId, priceDifferenceAccountId, revenueAccountId, expenseAccountId] =
      await Promise.all([
        this.findAccountByCode(tenantId, d.inventory),
        this.findAccountByCode(tenantId, d.cogs),
        this.findAccountByCode(tenantId, d.priceDifference),
        this.findAccountByCode(tenantId, d.revenue),
        this.findAccountByCode(tenantId, d.expense),
      ]);

    const [warehouse] = await tx.insert(warehouses)
      .values({
        tenantId,
        branchId,
        code: `${branchCode}-MAIN`,
        name: `${branchName} - Main Warehouse`,
        warehouseType: 'STANDARD',
        isDefault: true,
        inventoryAccountId,
        cogsAccountId,
        priceDifferenceAccountId,
        revenueAccountId,
        expenseAccountId,
      })
      .returning();
    return warehouse as Warehouse;
  }
}
