/**
 * Posting Period Service
 *
 * SAP B1 Fiscal Year / Posting Periods.
 * Manages fiscal year headers and their 12 monthly sub-periods.
 * Auto-seeds current year on tenant creation.
 */

import { eq, and, asc, desc } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors';
import { postingPeriods, postingSubPeriods } from '../db/schemas/postingPeriods';
import type { PostingPeriod, PostingSubPeriod } from '../db/schemas/postingPeriods';
import type {
  CreatePostingPeriodInput,
  UpdateSubPeriodInput,
  ListPostingPeriodInput,
  ListSubPeriodsInput,
} from '../validations/postingPeriodValidation';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export class PostingPeriodService extends BaseService {
  private static readonly TABLE = postingPeriods;
  private static readonly SUB_TABLE = postingSubPeriods;
  private static readonly ENTITY_NAME = 'PostingPeriod';

  // ─── List Fiscal Years ──────────────────────────────────────────────────────

  static async list(tenantId: string, params: ListPostingPeriodInput) {
    const filters = [];

    if (params.isActive !== undefined) {
      filters.push(eq(postingPeriods.isActive, params.isActive === 'true'));
    }

    if (params.fiscalYear !== undefined) {
      filters.push(eq(postingPeriods.fiscalYear, params.fiscalYear));
    }

    const { items, total } = await this.findMany<PostingPeriod>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [postingPeriods.name, postingPeriods.code],
      sortBy: postingPeriods.fiscalYear,
      sortOrder: 'desc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  // ─── Get By ID ──────────────────────────────────────────────────────────────

  static async getById(tenantId: string, id: string) {
    return this.findById<PostingPeriod>(tenantId, this.TABLE, id, this.ENTITY_NAME);
  }

  // ─── Get Sub-Periods for a Fiscal Year ──────────────────────────────────────

  static async getSubPeriods(tenantId: string, postingPeriodId: string, params: ListSubPeriodsInput) {
    const filters = [eq(postingSubPeriods.postingPeriodId, postingPeriodId)];

    const { items, total } = await this.findMany<PostingSubPeriod>(tenantId, this.SUB_TABLE, {
      page: params.page,
      limit: params.limit,
      sortBy: postingSubPeriods.periodNumber,
      sortOrder: 'asc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  // ─── Create Fiscal Year + 12 Sub-Periods ───────────────────────────────────

  static async create(tenantId: string, input: CreatePostingPeriodInput) {
    const code = `FY-${input.fiscalYear}`;

    // Uniqueness: one fiscal year per tenant
    const exists = await this.exists(tenantId, this.TABLE, eq(postingPeriods.code, code));
    if (exists) {
      throw new ConflictError(`Fiscal year ${input.fiscalYear} already exists`, 'ENTITY_YEAR_EXISTS', { year: input.fiscalYear });
    }

    return this.transaction(async (tx) => {
      // Insert fiscal year header
      const [period] = await tx.insert(postingPeriods).values({
        tenantId,
        code,
        name: `Fiscal Year ${input.fiscalYear}`,
        nameAr: `السنة المالية ${input.fiscalYear}`,
        fiscalYear: input.fiscalYear,
        numberOfPeriods: 12,
        startDate: input.startDate,
        endDate: input.endDate,
      }).returning();

      // Generate 12 monthly sub-periods
      const subPeriodValues = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(input.fiscalYear, month, 1);
        const monthEnd = new Date(input.fiscalYear, month + 1, 0); // last day of month

        const mm = String(month + 1).padStart(2, '0');
        subPeriodValues.push({
          tenantId,
          postingPeriodId: period.id,
          periodNumber: month + 1,
          code: `FY-${input.fiscalYear}-${mm}`,
          name: `${MONTHS_EN[month]} ${input.fiscalYear}`,
          nameAr: `${MONTHS_AR[month]} ${input.fiscalYear}`,
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0],
          status: 'OPEN',
        });
      }

      await tx.insert(postingSubPeriods).values(subPeriodValues);

      return period as PostingPeriod;
    });
  }

  // ─── Update Sub-Period (status / enable-disable) ────────────────────────────

  static async updateSubPeriod(tenantId: string, subPeriodId: string, input: UpdateSubPeriodInput) {
    const existing = await this.findById<PostingSubPeriod>(tenantId, this.SUB_TABLE, subPeriodId, 'PostingSubPeriod');

    // LOCKED sub-periods cannot be modified
    if (existing.status === 'LOCKED') {
      throw new ValidationError('Cannot modify a locked posting period', undefined, 'POSTING_PERIOD_LOCKED');
    }

    // Optimistic locking
    if (existing.version !== input.version) {
      throw new ConflictError('Record was modified by another user. Please refresh and try again.', 'OPTIMISTIC_LOCK_CONFLICT');
    }

    const updateData: Record<string, unknown> = {
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    const [updated] = await this.db
      .update(postingSubPeriods)
      .set(updateData)
      .where(
        and(
          eq(postingSubPeriods.id, subPeriodId),
          eq(postingSubPeriods.tenantId, tenantId),
        ),
      )
      .returning();

    return updated as PostingSubPeriod;
  }

  // ─── Seed for New Tenant ────────────────────────────────────────────────────

  static async seedForTenant(tenantId: string) {
    const currentYear = new Date().getFullYear();

    // Skip if already seeded
    const exists = await this.exists(
      tenantId,
      this.TABLE,
      eq(postingPeriods.fiscalYear, currentYear),
    );
    if (exists) return { skipped: true };

    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    await this.create(tenantId, {
      fiscalYear: currentYear,
      startDate,
      endDate,
    });

    return { skipped: false, year: currentYear, periodsCreated: 12 };
  }
}
