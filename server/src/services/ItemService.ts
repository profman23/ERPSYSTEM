/**
 * Item Service (Item Master Data)
 *
 * Extends BaseService (static methods, tenant isolation via first param).
 * Features:
 *   - Auto code generation (ITM-00001) with concurrent safety via UNIQUE index
 *   - Barcode uniqueness per tenant (service-level check)
 *   - Optimistic locking via `version` column
 *   - Image management (upload URL, remove)
 *   - Numeric fields stored as strings in DB (Drizzle numeric → string)
 */

import { eq, and, like, desc, ne, sql } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError } from '../core/errors';
import { auditService } from '../core/audit/auditService';
import { withRetry } from '../core/retry';
import { items } from '../db/schemas/items';
import type { Item } from '../db/schemas/items';
import type {
  CreateItemInput,
  UpdateItemInput,
  ListItemsParams,
} from '../validations/itemValidation';

export class ItemService extends BaseService {
  private static readonly TABLE = items;
  private static readonly ENTITY_NAME = 'Item';
  private static readonly CODE_PREFIX = 'ITM';
  private static readonly CODE_PAD = 5;

  // ─── Auto Code Generation (Concurrent-Safe) ──────────────────────────────
  // Uses transaction + FOR UPDATE to prevent TOCTOU race conditions.
  // Two users creating items simultaneously will get unique sequential codes.

  private static async generateCodeInTx(tx: typeof this.db, tenantId: string): Promise<string> {
    const result = await tx
      .select({ code: items.code })
      .from(items)
      .where(
        and(
          eq(items.tenantId, tenantId),
          like(items.code, `${this.CODE_PREFIX}-%`),
        ),
      )
      .orderBy(desc(items.code))
      .limit(1)
      .for('update');

    if (result.length === 0) {
      return `${this.CODE_PREFIX}-${String(1).padStart(this.CODE_PAD, '0')}`;
    }

    const lastNum = parseInt(result[0].code.replace(`${this.CODE_PREFIX}-`, ''), 10);
    return `${this.CODE_PREFIX}-${String(lastNum + 1).padStart(this.CODE_PAD, '0')}`;
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  static async list(tenantId: string, params: ListItemsParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(items.isActive, params.isActive === 'true'));
    }

    if (params.itemType) {
      filters.push(eq(items.itemType, params.itemType));
    }

    if (params.itemGroupId) {
      filters.push(eq(items.itemGroupId, params.itemGroupId));
    }

    const { items: rows, total } = await this.findMany<Item>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [items.code, items.name, items.nameAr, items.barcode],
      sortBy: items.code,
      sortOrder: 'asc',
      filters,
    });

    return { items: rows, total, page: params.page, limit: params.limit };
  }

  // ─── Get By ID ────────────────────────────────────────────────────────────

  static async getById(tenantId: string, id: string) {
    return this.findById<Item>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  static async create(tenantId: string, input: CreateItemInput) {
    // Barcode uniqueness (if provided)
    if (input.barcode) {
      const barcodeExists = await this.exists(
        tenantId,
        this.TABLE,
        and(eq(items.barcode, input.barcode), eq(items.isActive, true))!,
      );
      if (barcodeExists) {
        throw new ConflictError(`An active item with barcode '${input.barcode}' already exists`, 'ENTITY_BARCODE_EXISTS', { barcode: input.barcode });
      }
    }

    // Convert numeric fields to strings for DB storage (Drizzle numeric columns expect strings)
    const numericFields = {
      purchaseUomFactor: input.purchaseUomFactor != null ? String(input.purchaseUomFactor) : '1',
      salesUomFactor: input.salesUomFactor != null ? String(input.salesUomFactor) : '1',
      standardCost: input.standardCost != null ? String(input.standardCost) : null,
      lastPurchasePrice: input.lastPurchasePrice != null ? String(input.lastPurchasePrice) : null,
      defaultSellingPrice: input.defaultSellingPrice != null ? String(input.defaultSellingPrice) : null,
      minimumStock: input.minimumStock != null ? String(input.minimumStock) : null,
      maximumStock: input.maximumStock != null ? String(input.maximumStock) : null,
    };

    // Atomic code generation + insert inside transaction with retry for deadlock resilience
    const result = await withRetry(
      () =>
        this.transaction(async (tx) => {
          const code = await this.generateCodeInTx(tx, tenantId);
          const [inserted] = await tx
            .insert(this.TABLE)
            .values({ ...input, ...numericFields, code, tenantId })
            .returning();
          return inserted as Item;
        }),
      { maxRetries: 3, label: 'ItemService.create' },
    );
    auditService.log({ action: 'create', resourceType: 'item', resourceId: result.id, newData: result as Record<string, unknown> });
    return result;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  static async update(tenantId: string, id: string, input: UpdateItemInput) {
    // Fetch existing record for version check
    const existing = await this.findById<Item>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Optimistic locking
    if (existing.version !== input.version) {
      throw new ConflictError('This item was modified by another user. Please refresh and try again.', 'OPTIMISTIC_LOCK_CONFLICT');
    }

    // Barcode uniqueness if changing
    if (input.barcode && input.barcode !== existing.barcode) {
      const barcodeExists = await this.exists(
        tenantId,
        this.TABLE,
        and(
          eq(items.barcode, input.barcode),
          eq(items.isActive, true),
          ne(items.id, id),
        )!,
      );
      if (barcodeExists) {
        throw new ConflictError(`An active item with barcode '${input.barcode}' already exists`, 'ENTITY_BARCODE_EXISTS', { barcode: input.barcode });
      }
    }

    // Build update data
    const { version, ...updateFields } = input;
    const dbInput: Record<string, unknown> = {
      ...updateFields,
      version: existing.version + 1,
    };

    // Convert numeric fields to strings if present
    if (updateFields.purchaseUomFactor != null) {
      dbInput.purchaseUomFactor = String(updateFields.purchaseUomFactor);
    }
    if (updateFields.salesUomFactor != null) {
      dbInput.salesUomFactor = String(updateFields.salesUomFactor);
    }
    if (updateFields.standardCost !== undefined) {
      dbInput.standardCost = updateFields.standardCost != null ? String(updateFields.standardCost) : null;
    }
    if (updateFields.lastPurchasePrice !== undefined) {
      dbInput.lastPurchasePrice = updateFields.lastPurchasePrice != null ? String(updateFields.lastPurchasePrice) : null;
    }
    if (updateFields.defaultSellingPrice !== undefined) {
      dbInput.defaultSellingPrice = updateFields.defaultSellingPrice != null ? String(updateFields.defaultSellingPrice) : null;
    }
    if (updateFields.minimumStock !== undefined) {
      dbInput.minimumStock = updateFields.minimumStock != null ? String(updateFields.minimumStock) : null;
    }
    if (updateFields.maximumStock !== undefined) {
      dbInput.maximumStock = updateFields.maximumStock != null ? String(updateFields.maximumStock) : null;
    }

    return this.auditableUpdateById<Item>(tenantId, this.TABLE, id, dbInput, 'item', this.ENTITY_NAME);
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  static async remove(tenantId: string, id: string) {
    await this.auditableSoftDelete(tenantId, this.TABLE, id, 'item', this.ENTITY_NAME);
  }

  // ─── Image Management ────────────────────────────────────────────────────

  static async uploadImage(tenantId: string, id: string, imageUrl: string) {
    // Verify item exists
    await this.findById<Item>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    return this.updateById<Item>(tenantId, this.TABLE, id, { imageUrl }, this.ENTITY_NAME);
  }

  static async removeImage(tenantId: string, id: string): Promise<string | null> {
    const item = await this.findById<Item>(tenantId, this.TABLE, id, this.ENTITY_NAME);
    const oldImageUrl = item.imageUrl;

    if (oldImageUrl) {
      await this.updateById<Item>(tenantId, this.TABLE, id, { imageUrl: null }, this.ENTITY_NAME);
    }

    return oldImageUrl;
  }
}
