import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_BRANCH_ID } from '../test/helpers';

// Mock chainable methods
const mockOnConflictDoUpdate = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();

function setupChain() {
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  mockOnConflictDoUpdate.mockResolvedValue(undefined);
}

// Mock db module (GLPostingService imports db for TransactionDB type)
vi.mock('../db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

// Import AFTER mocking
import { GLPostingService } from './GLPostingService';
import { accountBalances } from '../db/schemas/accountBalances';

// Test fixtures
const TEST_META = {
  branchId: TEST_BRANCH_ID,
  postingSubPeriodId: 'sp-1',
  fiscalYear: 2025,
  periodNumber: 1,
};

describe('GLPostingService', () => {
  // Use the tx mock (same shape as db)
  const tx = {
    insert: (...args: unknown[]) => mockInsert(...args),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('postJournalEntry', () => {
    it('posts balanced JE with 2 lines (debit + credit) — insert called twice', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '1000', credit: '0' },
        { accountId: 'acc-2', debit: '0', credit: '1000' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledWith(accountBalances);
    });

    it('groups 2 lines with same accountId into 1 insert', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '500', credit: '0' },
        { accountId: 'acc-1', debit: '300', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          periodDebit: '800',
          periodCredit: '0',
        }),
      );
    });

    it('skips zero-amount lines', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '0', credit: '0' },
        { accountId: 'acc-2', debit: '500', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      // Only acc-2 should produce an insert
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc-2' }),
      );
    });

    it('handles multiple unique accounts (3 lines, 3 accounts)', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '1000', credit: '0' },
        { accountId: 'acc-2', debit: '0', credit: '700' },
        { accountId: 'acc-3', debit: '0', credit: '300' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockInsert).toHaveBeenCalledTimes(3);
    });

    it('calls insert with correct values (tenantId, accountId, amounts, meta fields)', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '2500', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockValues).toHaveBeenCalledWith({
        tenantId: TEST_TENANT_A,
        accountId: 'acc-1',
        postingSubPeriodId: 'sp-1',
        branchId: TEST_BRANCH_ID,
        fiscalYear: 2025,
        periodNumber: 1,
        openingDebit: '0',
        openingCredit: '0',
        periodDebit: '2500',
        periodCredit: '0',
        closingDebit: '2500',
        closingCredit: '0',
        transactionCount: 1,
        version: 1,
      });
    });

    it('uses onConflictDoUpdate with correct target keys', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '100', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
      const call = mockOnConflictDoUpdate.mock.calls[0][0];
      expect(call.target).toEqual([
        accountBalances.tenantId,
        accountBalances.accountId,
        accountBalances.postingSubPeriodId,
        accountBalances.branchId,
      ]);
      // set should contain periodDebit, periodCredit, closingDebit, closingCredit, transactionCount, version, updatedAt
      expect(call.set).toHaveProperty('periodDebit');
      expect(call.set).toHaveProperty('periodCredit');
      expect(call.set).toHaveProperty('closingDebit');
      expect(call.set).toHaveProperty('closingCredit');
      expect(call.set).toHaveProperty('transactionCount');
      expect(call.set).toHaveProperty('version');
      expect(call.set).toHaveProperty('updatedAt');
    });

    it('handles reversal lines (amounts are correct when debit/credit swapped)', async () => {
      // Reversal: original was debit 1000 on acc-1, credit 1000 on acc-2
      // Reversal swaps: credit 1000 on acc-1, debit 1000 on acc-2
      const reversalLines = [
        { accountId: 'acc-1', debit: '0', credit: '1000' },
        { accountId: 'acc-2', debit: '1000', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, reversalLines);

      expect(mockInsert).toHaveBeenCalledTimes(2);

      // First call: acc-1 with credit
      const firstCall = mockValues.mock.calls[0][0];
      expect(firstCall.accountId).toBe('acc-1');
      expect(firstCall.periodDebit).toBe('0');
      expect(firstCall.periodCredit).toBe('1000');

      // Second call: acc-2 with debit
      const secondCall = mockValues.mock.calls[1][0];
      expect(secondCall.accountId).toBe('acc-2');
      expect(secondCall.periodDebit).toBe('1000');
      expect(secondCall.periodCredit).toBe('0');
    });

    it('sets transactionCount = 1 for new inserts', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '500', credit: '0' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ transactionCount: 1 }),
      );
    });

    it('does not call insert when lines array is empty', async () => {
      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, []);

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockValues).not.toHaveBeenCalled();
    });

    it('sets closing = opening + period for initial insert values (opening is 0)', async () => {
      const lines = [
        { accountId: 'acc-1', debit: '750', credit: '250' },
      ];

      await GLPostingService.postJournalEntry(tx, TEST_TENANT_A, TEST_META, lines);

      const insertedValues = mockValues.mock.calls[0][0];
      // Opening is 0, so closing should equal period
      expect(insertedValues.openingDebit).toBe('0');
      expect(insertedValues.openingCredit).toBe('0');
      expect(insertedValues.periodDebit).toBe('750');
      expect(insertedValues.periodCredit).toBe('250');
      // Closing = opening(0) + period = period
      expect(insertedValues.closingDebit).toBe('750');
      expect(insertedValues.closingCredit).toBe('250');
    });
  });
});
