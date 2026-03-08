/**
 * Item Group Service
 *
 * Handles item group CRUD with tenant isolation.
 * Business rules:
 *   - code must be unique per tenant
 *   - Auto-assigns GL accounts based on itemGroupType when not provided
 *   - GL account codes follow IAS/IFRS standards per inventory class
 */

import { eq, and } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { db } from '../db';
import { itemGroups } from '../db/schemas/itemGroups';
import type { ItemGroup } from '../db/schemas/itemGroups';
import { chartOfAccounts } from '../db/schemas/chartOfAccounts';
import type { CreateItemGroupInput, UpdateItemGroupInput, ListItemGroupParams } from '../validations/itemGroupValidation';

export class ItemGroupService extends BaseService {
  private static readonly TABLE = itemGroups;
  private static readonly ENTITY_NAME = 'ItemGroup';

  /** IAS/IFRS compliant default GL account codes per item group type */
  private static readonly DEFAULT_ACCOUNTS_BY_TYPE: Record<string, {
    inventory: string | null;
    cogs: string;
    purchase: string | null;
    revenue: string;
  }> = {
    MEDICINE:        { inventory: '1141', cogs: '5110', purchase: '5151', revenue: '4210' },
    SURGICAL_SUPPLY: { inventory: '1142', cogs: '5120', purchase: '5152', revenue: '4220' },
    EQUIPMENT:       { inventory: '1143', cogs: '5130', purchase: '5153', revenue: '4230' },
    CONSUMABLE:      { inventory: '1142', cogs: '5120', purchase: '5152', revenue: '4220' },
    SERVICE:         { inventory: null,   cogs: '5140', purchase: null,   revenue: '4110' },
  };

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

  static async list(tenantId: string, params: ListItemGroupParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(itemGroups.isActive, params.isActive === 'true'));
    }

    if (params.itemGroupType) {
      filters.push(eq(itemGroups.itemGroupType, params.itemGroupType));
    }

    const { items, total } = await this.findMany<ItemGroup>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [itemGroups.name, itemGroups.nameAr, itemGroups.code],
      sortBy: itemGroups.name,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  static async getById(tenantId: string, id: string) {
    return this.findById<ItemGroup>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  static async create(tenantId: string, input: CreateItemGroupInput) {
    // Business rule: code must be unique per tenant
    const codeExists = await this.exists(tenantId, this.TABLE, eq(itemGroups.code, input.code));
    if (codeExists) {
      throw new ConflictError(`Item group with code '${input.code}' already exists`);
    }

    // Auto-assign default GL accounts if not provided (IAS/IFRS standard codes)
    const defaults = this.DEFAULT_ACCOUNTS_BY_TYPE[input.itemGroupType];
    if (defaults) {
      if (!input.inventoryAccountId && defaults.inventory) {
        input.inventoryAccountId = await this.findAccountByCode(tenantId, defaults.inventory);
      }
      if (!input.cogsAccountId) {
        input.cogsAccountId = await this.findAccountByCode(tenantId, defaults.cogs);
      }
      if (!input.purchaseAccountId && defaults.purchase) {
        input.purchaseAccountId = await this.findAccountByCode(tenantId, defaults.purchase);
      }
      if (!input.revenueAccountId) {
        input.revenueAccountId = await this.findAccountByCode(tenantId, defaults.revenue);
      }
    }

    return this.insertOne<ItemGroup>(tenantId, this.TABLE, input);
  }

  static async update(tenantId: string, id: string, input: UpdateItemGroupInput) {
    // If updating code, check uniqueness
    if (input.code) {
      const existing = await this.findByIdOrNull<ItemGroup>(tenantId, this.TABLE, id);
      if (existing && existing.code !== input.code) {
        const codeExists = await this.exists(tenantId, this.TABLE, eq(itemGroups.code, input.code));
        if (codeExists) {
          throw new ConflictError(`Item group with code '${input.code}' already exists`);
        }
      }
    }

    return this.updateById<ItemGroup>(tenantId, this.TABLE, id, input, this.ENTITY_NAME);
  }

  static async remove(tenantId: string, id: string) {
    await this.softDelete(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }
}
