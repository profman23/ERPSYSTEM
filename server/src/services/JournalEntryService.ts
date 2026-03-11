/**
 * Journal Entry Service — Double-Entry Bookkeeping Engine
 *
 * Document Immutability: Save = POSTED (no DRAFT). Immutable after creation.
 * Corrections via Reverse Transactions only.
 *
 * Golden rule: SUM(debit) = SUM(credit) — enforced before every save.
 * Posting period validation: date must fall in OPEN sub-period.
 * Account validation: all accounts must be isPostable = true.
 * Document number: auto-generated via DocumentNumberSeriesService.
 */

import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { BaseService } from '../core/service';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors';
import { auditService } from '../core/audit/auditService';
import { db } from '../db';
import { journalEntries, journalEntryLines } from '../db/schemas/journalEntries';
import { postingSubPeriods } from '../db/schemas/postingPeriods';
import { chartOfAccounts } from '../db/schemas/chartOfAccounts';
import { users } from '../db/schemas/users';
import { DocumentNumberSeriesService } from './DocumentNumberSeriesService';
import type { JournalEntry, JournalEntryLine } from '../db/schemas/journalEntries';
import type {
  CreateJournalEntryInput,
  ReverseJournalEntryInput,
  ListJournalEntryParams,
} from '../validations/journalEntryValidation';

export class JournalEntryService extends BaseService {
  private static readonly TABLE = journalEntries;
  private static readonly LINES_TABLE = journalEntryLines;
  private static readonly ENTITY_NAME = 'JournalEntry';

  // ─── List ──────────────────────────────────────────────────────────────────

  static async list(tenantId: string, params: ListJournalEntryParams) {
    const filters = [];

    if (params.status) {
      filters.push(eq(journalEntries.status, params.status));
    }

    if (params.branchId) {
      filters.push(eq(journalEntries.branchId, params.branchId));
    }

    if (params.sourceType) {
      filters.push(eq(journalEntries.sourceType, params.sourceType));
    }

    if (params.postingDateFrom) {
      filters.push(gte(journalEntries.postingDate, params.postingDateFrom));
    }

    if (params.postingDateTo) {
      filters.push(lte(journalEntries.postingDate, params.postingDateTo));
    }

    const { items, total } = await this.findMany<JournalEntry>(tenantId, this.TABLE, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      searchColumns: [journalEntries.code, journalEntries.remarks, journalEntries.reference],
      sortBy: journalEntries.createdAt,
      sortOrder: 'desc',
      filters,
    });

    return { items, total, page: params.page, limit: params.limit };
  }

  // ─── Get By ID (with lines) ────────────────────────────────────────────────

  static async getById(tenantId: string, id: string) {
    const entry = await this.findById<JournalEntry>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    // Fetch lines with account info
    const lines = await db
      .select({
        id: journalEntryLines.id,
        tenantId: journalEntryLines.tenantId,
        journalEntryId: journalEntryLines.journalEntryId,
        lineNumber: journalEntryLines.lineNumber,
        accountId: journalEntryLines.accountId,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
        remarks: journalEntryLines.remarks,
        remarksAr: journalEntryLines.remarksAr,
        costCenter: journalEntryLines.costCenter,
        isActive: journalEntryLines.isActive,
        createdAt: journalEntryLines.createdAt,
        updatedAt: journalEntryLines.updatedAt,
        accountCode: chartOfAccounts.code,
        accountName: chartOfAccounts.name,
        accountNameAr: chartOfAccounts.nameAr,
      })
      .from(journalEntryLines)
      .leftJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(
        and(
          eq(journalEntryLines.tenantId, tenantId),
          eq(journalEntryLines.journalEntryId, id),
        ),
      )
      .orderBy(journalEntryLines.lineNumber);

    // Creator info
    let createdByUser = null;
    if (entry.createdBy) {
      const [creator] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, entry.createdBy));
      createdByUser = creator ?? null;
    }

    // Reversal user info (who created the reversal entry)
    let reversedByUser = null;
    if (entry.reversedById) {
      const [reversalEntry] = await db
        .select({
          createdBy: journalEntries.createdBy,
          createdAt: journalEntries.createdAt,
        })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.id, entry.reversedById),
            eq(journalEntries.tenantId, tenantId),
          ),
        );
      if (reversalEntry?.createdBy) {
        const [reverser] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, reversalEntry.createdBy));
        reversedByUser = reverser
          ? { ...reverser, reversedAt: reversalEntry.createdAt }
          : null;
      }
    }

    return { ...entry, lines, createdByUser, reversedByUser };
  }

  // ─── Create (Save = POSTED, Immutable) ─────────────────────────────────────

  static async create(tenantId: string, userId: string, input: CreateJournalEntryInput) {
    // 1. Validate posting period
    await this.validatePostingPeriod(tenantId, input.postingDate);

    // 2. Validate all accounts are postable
    await this.validateAccounts(tenantId, input.lines.map((l) => l.accountId));

    // 3. Validate golden rule (SUM debit = SUM credit) — already checked in Zod, double-check here
    const totalDebit = input.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) >= 0.0001) {
      throw new ValidationError('Total debit must equal total credit');
    }

    // 4. Generate document number (concurrent-safe via SELECT FOR UPDATE + withRetry)
    const code = await DocumentNumberSeriesService.getNextNumber(
      tenantId,
      input.branchId,
      'JOURNAL_ENTRY',
    );

    // 5. Atomic insert: header + lines in transaction
    const result = await this.transaction(async (tx) => {
      // Insert header
      const [entry] = await tx.insert(journalEntries).values({
        tenantId,
        branchId: input.branchId,
        code,
        postingDate: input.postingDate,
        documentDate: input.documentDate,
        dueDate: input.dueDate,
        remarks: input.remarks,
        remarksAr: input.remarksAr,
        reference: input.reference,
        sourceType: 'MANUAL',
        status: 'POSTED',
        totalDebit: String(totalDebit),
        totalCredit: String(totalCredit),
        createdBy: userId,
      }).returning();

      // Insert lines
      const lineValues = input.lines.map((line, idx) => ({
        tenantId,
        journalEntryId: entry.id,
        lineNumber: idx + 1,
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        remarks: line.remarks,
        remarksAr: line.remarksAr,
      }));

      await tx.insert(journalEntryLines).values(lineValues);

      return entry as JournalEntry;
    });
    auditService.log({ action: 'create', resourceType: 'journal_entry', resourceId: result.id, newData: result as Record<string, unknown> });
    return result;
  }

  // ─── Reverse (POSTED → REVERSED + create new reversal entry) ──────────────

  static async reverse(tenantId: string, userId: string, id: string, input: ReverseJournalEntryInput) {
    // 1. Find and validate original entry
    const original = await this.findById<JournalEntry>(tenantId, this.TABLE, id, this.ENTITY_NAME);

    if (original.status !== 'POSTED') {
      throw new ValidationError('Only POSTED entries can be reversed');
    }

    if (original.reversedById) {
      throw new ValidationError('This entry has already been reversed');
    }

    // 2. Optimistic locking
    if (original.version !== input.version) {
      throw new ConflictError('Record was modified by another user. Please refresh and try again.');
    }

    // 3. Validate reversal date posting period
    await this.validatePostingPeriod(tenantId, input.reversalDate);

    // 4. Get original lines
    const originalLines = await db
      .select()
      .from(journalEntryLines)
      .where(
        and(
          eq(journalEntryLines.tenantId, tenantId),
          eq(journalEntryLines.journalEntryId, id),
        ),
      )
      .orderBy(journalEntryLines.lineNumber);

    if (originalLines.length === 0) {
      throw new ValidationError('Original entry has no lines');
    }

    // 5. Generate new code for reversal entry
    const reversalCode = await DocumentNumberSeriesService.getNextNumber(
      tenantId,
      original.branchId,
      'JOURNAL_ENTRY',
    );

    // 6. Atomic: create reversal entry + mark original as REVERSED
    const result = await this.transaction(async (tx) => {
      // Create reversal entry (swap debit ↔ credit)
      const [reversalEntry] = await tx.insert(journalEntries).values({
        tenantId,
        branchId: original.branchId,
        code: reversalCode,
        postingDate: input.reversalDate,
        documentDate: input.reversalDate,
        remarks: input.remarks || `Reversal of ${original.code}`,
        remarksAr: `عكس ${original.code}`,
        reference: original.reference,
        sourceType: 'REVERSAL',
        status: 'POSTED',
        reversalOfId: original.id,
        totalDebit: original.totalCredit,   // Swapped
        totalCredit: original.totalDebit,   // Swapped
        createdBy: userId,
      }).returning();

      // Create reversal lines (swap debit ↔ credit)
      const reversalLineValues = originalLines.map((line, idx) => ({
        tenantId,
        journalEntryId: reversalEntry.id,
        lineNumber: idx + 1,
        accountId: line.accountId,
        debit: line.credit,     // Swapped
        credit: line.debit,     // Swapped
        remarks: line.remarks,
        remarksAr: line.remarksAr,
      }));

      await tx.insert(journalEntryLines).values(reversalLineValues);

      // Mark original as REVERSED
      await tx
        .update(journalEntries)
        .set({
          status: 'REVERSED',
          reversedById: reversalEntry.id,
          version: original.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(journalEntries.id, original.id),
            eq(journalEntries.tenantId, tenantId),
          ),
        );

      return reversalEntry as JournalEntry;
    });
    auditService.log({ action: 'update', resourceType: 'journal_entry', resourceId: id, oldData: { status: 'POSTED' } as Record<string, unknown>, newData: { status: 'REVERSED', reversedById: result.id } as Record<string, unknown> });
    auditService.log({ action: 'create', resourceType: 'journal_entry', resourceId: result.id, newData: result as Record<string, unknown> });
    return result;
  }

  // ─── Validate Posting Period ───────────────────────────────────────────────

  static async validatePostingPeriod(tenantId: string, postingDate: string): Promise<void> {
    const subPeriods = await db
      .select()
      .from(postingSubPeriods)
      .where(
        and(
          eq(postingSubPeriods.tenantId, tenantId),
          lte(postingSubPeriods.startDate, postingDate),
          gte(postingSubPeriods.endDate, postingDate),
        ),
      )
      .limit(1);

    if (subPeriods.length === 0) {
      throw new ValidationError('No posting period found for the specified date. Please create a fiscal year first.');
    }

    const period = subPeriods[0];

    if (period.status !== 'OPEN') {
      throw new ValidationError(`Posting period "${period.name}" is ${period.status}. Cannot post to a ${period.status} period.`);
    }

    if (!period.isActive) {
      throw new ValidationError(`Posting period "${period.name}" is disabled.`);
    }
  }

  // ─── Validate Accounts ─────────────────────────────────────────────────────

  private static async validateAccounts(tenantId: string, accountIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(accountIds)];

    for (const accountId of uniqueIds) {
      const accounts = await db
        .select({
          id: chartOfAccounts.id,
          isPostable: chartOfAccounts.isPostable,
          isActive: chartOfAccounts.isActive,
          code: chartOfAccounts.code,
        })
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.id, accountId),
            eq(chartOfAccounts.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (accounts.length === 0) {
        throw new ValidationError(`Account ${accountId} does not exist`);
      }

      if (!accounts[0].isActive) {
        throw new ValidationError(`Account "${accounts[0].code}" is inactive`);
      }

      if (!accounts[0].isPostable) {
        throw new ValidationError(`Account "${accounts[0].code}" is not postable (group account)`);
      }
    }
  }

  // ─── Get By Source Document ─────────────────────────────────────────────────

  static async getBySourceDocument(tenantId: string, sourceType: string, sourceId: string) {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.sourceType, sourceType),
          eq(journalEntries.sourceId, sourceId),
        ),
      )
      .orderBy(journalEntries.createdAt);

    return entries;
  }
}
