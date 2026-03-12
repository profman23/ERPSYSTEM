/**
 * GL Posting Service — Atomic Balance Updates on JE Creation/Reversal
 *
 * Called INSIDE the JournalEntryService transaction to ensure atomicity:
 * if balance update fails, the JE creation is rolled back.
 *
 * Pattern: UPSERT per unique account in JE lines.
 *   - INSERT if first posting to (account, sub-period, branch)
 *   - ON CONFLICT UPDATE: increment periodDebit/Credit, recalculate closing, bump version
 *
 * Concurrency: Row-level lock via ON CONFLICT UPDATE.
 * Different accounts = zero contention. Same account = row serialization (correct).
 *
 * Performance: 2-5 UPSERT queries per JE (typical JE has 2-5 unique accounts). Each <5ms.
 */

import { sql } from 'drizzle-orm';
import { accountBalances } from '../db/schemas/accountBalances';
import { db } from '../db';

// Transaction type — matches BaseService.transaction pattern (tx has same API as db)
type TransactionDB = typeof db;

interface PostingEntryMeta {
  branchId: string;
  postingSubPeriodId: string;
  fiscalYear: number;
  periodNumber: number;
}

interface PostingLine {
  accountId: string;
  debit: string;
  credit: string;
}

export class GLPostingService {

  /**
   * Post JE lines to account balances. Called INSIDE JE creation transaction.
   *
   * Groups lines by accountId to minimize DB operations (one UPSERT per unique account).
   * Uses ON CONFLICT DO UPDATE for concurrent-safe atomic balance updates.
   */
  static async postJournalEntry(
    tx: TransactionDB,
    tenantId: string,
    meta: PostingEntryMeta,
    lines: PostingLine[],
  ): Promise<void> {
    // Group lines by accountId — reduces N lines to M unique accounts (M ≤ N)
    const accountAggregates = new Map<string, { totalDebit: number; totalCredit: number }>();

    for (const line of lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;

      if (debit === 0 && credit === 0) continue; // Skip zero-amount lines

      const existing = accountAggregates.get(line.accountId);
      if (existing) {
        existing.totalDebit += debit;
        existing.totalCredit += credit;
      } else {
        accountAggregates.set(line.accountId, { totalDebit: debit, totalCredit: credit });
      }
    }

    // UPSERT per unique account
    for (const [accountId, amounts] of accountAggregates) {
      await tx
        .insert(accountBalances)
        .values({
          tenantId,
          accountId,
          postingSubPeriodId: meta.postingSubPeriodId,
          branchId: meta.branchId,
          fiscalYear: meta.fiscalYear,
          periodNumber: meta.periodNumber,
          openingDebit: '0',
          openingCredit: '0',
          periodDebit: String(amounts.totalDebit),
          periodCredit: String(amounts.totalCredit),
          closingDebit: String(amounts.totalDebit),
          closingCredit: String(amounts.totalCredit),
          transactionCount: 1,
          version: 1,
        })
        .onConflictDoUpdate({
          target: [
            accountBalances.tenantId,
            accountBalances.accountId,
            accountBalances.postingSubPeriodId,
            accountBalances.branchId,
          ],
          set: {
            periodDebit: sql`${accountBalances.periodDebit} + ${String(amounts.totalDebit)}::numeric`,
            periodCredit: sql`${accountBalances.periodCredit} + ${String(amounts.totalCredit)}::numeric`,
            closingDebit: sql`${accountBalances.openingDebit} + ${accountBalances.periodDebit} + ${String(amounts.totalDebit)}::numeric`,
            closingCredit: sql`${accountBalances.openingCredit} + ${accountBalances.periodCredit} + ${String(amounts.totalCredit)}::numeric`,
            transactionCount: sql`${accountBalances.transactionCount} + 1`,
            version: sql`${accountBalances.version} + 1`,
            updatedAt: sql`now()`,
          },
        });
    }
  }
}
