/**
 * Document Number Series Service
 *
 * Enterprise-grade, branch-scoped document numbering.
 * Handles concurrent number generation via SELECT ... FOR UPDATE.
 * Auto-seeds 7 document types when a branch is created.
 *
 * Follows BaseService pattern (see SpeciesService for reference).
 * Concurrency pattern from TenantCodeGenerator.ts.
 */

import { eq, and, sql, notInArray } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, NotFoundError } from '../core/errors';
import logger from '../config/logger';
import { withRetry } from '../core/retry';
import { db } from '../db';
import { documentNumberSeries } from '../db/schemas/documentNumberSeries';
import { branches } from '../db/schemas/branches';
import type { DocumentNumberSeries } from '../db/schemas/documentNumberSeries';
import type {
  ListDocumentNumberSeriesParams,
  UpdateDocumentNumberSeriesInput,
} from '../validations/documentNumberSeriesValidation';

// ─── Document Type Configuration ────────────────────────────────────────────

const DOCUMENT_TYPES = {
  PURCHASE_ORDER:   { name: 'Purchase Order',    nameAr: 'طلب شراء',     startOffset: 10_000_000 },
  GOODS_RECEIPT_PO: { name: 'Goods Receipt PO',  nameAr: 'استلام بضاعة',  startOffset: 10_000_000 },
  SALES_INVOICE:    { name: 'Sales Invoice',      nameAr: 'فاتورة مبيعات', startOffset: 10_000_000 },
  CREDIT_NOTE:      { name: 'Credit Note',        nameAr: 'إشعار دائن',   startOffset: 10_000_000 },
  DELIVERY_NOTE:    { name: 'Delivery Note',      nameAr: 'إذن تسليم',    startOffset: 10_000_000 },
  PAYMENT_RECEIPT:  { name: 'Payment Receipt',    nameAr: 'إيصال دفع',    startOffset: 10_000_000 },
  JOURNAL_ENTRY:    { name: 'Journal Entry',      nameAr: 'قيد يومية',    startOffset: 10_000_000 },
} as const;

type DocumentType = keyof typeof DOCUMENT_TYPES;

export class DocumentNumberSeriesService extends BaseService {
  private static readonly TABLE = documentNumberSeries;
  private static readonly ENTITY_NAME = 'DocumentNumberSeries';

  /**
   * List all document number series for a tenant (paginated, filterable).
   */
  static async list(tenantId: string, params: ListDocumentNumberSeriesParams) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(documentNumberSeries.isActive, params.isActive === 'true'));
    }

    if (params.branchId) {
      filters.push(eq(documentNumberSeries.branchId, params.branchId));
    }

    if (params.documentType) {
      filters.push(eq(documentNumberSeries.documentType, params.documentType));
    }

    const { items, total } = await this.findMany<DocumentNumberSeries>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [documentNumberSeries.name, documentNumberSeries.nameAr, documentNumberSeries.documentType],
      sortBy: documentNumberSeries.documentType,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  /**
   * Get a single series by ID.
   */
  static async getById(tenantId: string, id: string) {
    return this.findById<DocumentNumberSeries>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  /**
   * Admin update: adjust prefix, separator, padding, or nextNumber.
   * Uses optimistic locking (version column) per CLAUDE.md § Concurrency Control.
   */
  static async update(tenantId: string, id: string, input: UpdateDocumentNumberSeriesInput) {
    const existing = await this.findById<DocumentNumberSeries>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Optimistic locking check
    if (existing.version !== input.version) {
      throw new ConflictError('Record was modified by another user. Please refresh and try again.', 'OPTIMISTIC_LOCK_CONFLICT');
    }

    const { version, ...updateFields } = input;
    const dbInput: Record<string, unknown> = {
      ...updateFields,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    return this.updateById<DocumentNumberSeries>(tenantId, this.TABLE, id, dbInput, this.ENTITY_NAME);
  }

  /**
   * Seed all 7 document type series for a newly created branch.
   * Called inside BranchService.create() transaction.
   *
   * @param tx - Transaction instance (from BaseService.transaction)
   * @param tenantId - Tenant UUID
   * @param branchId - Newly created branch UUID
   * @param branchSequence - Order of this branch (1st=1, 2nd=2, etc.)
   */
  static async seedForBranch(
    tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
    tenantId: string,
    branchId: string,
    branchSequence: number,
  ): Promise<void> {
    const rows = Object.entries(DOCUMENT_TYPES).map(([docType, config]) => ({
      tenantId,
      branchId,
      documentType: docType,
      prefix: '',
      separator: '',
      nextNumber: branchSequence * config.startOffset + 1,
      padding: 8,
      branchSequence,
      name: config.name,
      nameAr: config.nameAr,
    }));

    await tx.insert(documentNumberSeries).values(rows);
  }

  /**
   * Atomically get the next document number and increment the counter.
   * Uses SELECT ... FOR UPDATE for pessimistic locking.
   * Wrapped in withRetry() for deadlock/serialization resilience.
   *
   * @returns Formatted document number string (e.g., "10000001" or "PO-10000001")
   */
  static async getNextNumber(
    tenantId: string,
    branchId: string,
    documentType: string,
  ): Promise<string> {
    return withRetry(
      async () => {
        return db.transaction(async (tx) => {
          // Row-level lock via FOR UPDATE — blocks concurrent readers until commit
          const rows = await tx
            .select({
              id: documentNumberSeries.id,
              prefix: documentNumberSeries.prefix,
              separator: documentNumberSeries.separator,
              nextNumber: documentNumberSeries.nextNumber,
              padding: documentNumberSeries.padding,
            })
            .from(documentNumberSeries)
            .where(
              and(
                eq(documentNumberSeries.tenantId, tenantId),
                eq(documentNumberSeries.branchId, branchId),
                eq(documentNumberSeries.documentType, documentType),
                eq(documentNumberSeries.isActive, true),
              ),
            )
            .for('update')
            .limit(1);

          if (rows.length === 0) {
            throw new NotFoundError(
              'DocumentNumberSeries',
              `${documentType} for branch ${branchId}`,
            );
          }

          const series = rows[0];
          const currentNumber = series.nextNumber;

          // Increment counter atomically
          await tx
            .update(documentNumberSeries)
            .set({
              nextNumber: currentNumber + 1,
              updatedAt: new Date(),
            })
            .where(eq(documentNumberSeries.id, series.id));

          // Format: {prefix}{separator}{paddedNumber}
          const paddedNumber = String(currentNumber).padStart(series.padding, '0');
          if (series.prefix) {
            return `${series.prefix}${series.separator}${paddedNumber}`;
          }
          return paddedNumber;
        });
      },
      {
        maxRetries: 3,
        label: `getNextNumber(${documentType})`,
      },
    );
  }

  /**
   * Count all branches for a tenant (including inactive) to determine sequence number.
   * Used by BranchService.create() before calling seedForBranch().
   */
  static async getNextBranchSequence(tenantId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(branches)
      .where(eq(branches.tenantId, tenantId));

    return Number(count) + 1;
  }

  /**
   * Backfill document number series for branches created before this feature.
   * Idempotent — only seeds branches that have zero series rows.
   * Called once at server startup.
   */
  static async backfillExistingBranches(): Promise<void> {
    // 1. Get branch IDs that already have series
    const seededRows = await db
      .selectDistinct({ branchId: documentNumberSeries.branchId })
      .from(documentNumberSeries);
    const seededBranchIds = seededRows.map((r) => r.branchId);

    // 2. Get all branches that are missing series
    const missingQuery = db
      .select({
        id: branches.id,
        tenantId: branches.tenantId,
      })
      .from(branches);

    const missingBranches = seededBranchIds.length > 0
      ? await missingQuery.where(notInArray(branches.id, seededBranchIds))
      : await missingQuery;

    if (missingBranches.length === 0) {
      logger.info('📋 Document Number Series: all branches already seeded');
      return;
    }

    // 3. Group by tenant for correct sequence calculation
    const byTenant = new Map<string, string[]>();
    for (const branch of missingBranches) {
      const list = byTenant.get(branch.tenantId) || [];
      list.push(branch.id);
      byTenant.set(branch.tenantId, list);
    }

    let totalSeeded = 0;

    for (const [tenantId, branchIds] of byTenant) {
      // Count existing branches for this tenant to get base sequence
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(branches)
        .where(eq(branches.tenantId, tenantId));

      const totalBranches = Number(count);
      // Sequence for missing branches: assign based on total - missing + index
      const existingSeeded = totalBranches - branchIds.length;

      for (let i = 0; i < branchIds.length; i++) {
        const branchSequence = existingSeeded + i + 1;
        await db.transaction(async (tx) => {
          await this.seedForBranch(tx, tenantId, branchIds[i], branchSequence);
        });
        totalSeeded++;
      }
    }

    logger.info(`📋 Document Number Series: backfilled ${totalSeeded} branches (${totalSeeded * 7} series rows)`);
  }
}
