import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_TENANT_A, TEST_USER_ID, TEST_BRANCH_ID } from '../test/helpers';

// ─── Mock chain fns ────────────────────────────────────────────────────────
const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockLeftJoin = vi.fn();

// Transaction mocks
const mockTxInsert = vi.fn();
const mockTxValues = vi.fn();
const mockTxReturning = vi.fn();
const mockTxUpdate = vi.fn();
const mockTxSet = vi.fn();
const mockTxWhere = vi.fn();

function setupChain() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
  mockLeftJoin.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({
    orderBy: mockOrderBy,
    limit: mockLimit,
    returning: mockReturning,
  });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ offset: mockOffset });
  mockOffset.mockResolvedValue([]);
  mockReturning.mockResolvedValue([]);

  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });

  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });

  // Transaction chains
  mockTxInsert.mockReturnValue({ values: mockTxValues });
  mockTxValues.mockReturnValue({ returning: mockTxReturning });
  mockTxReturning.mockResolvedValue([]);
  mockTxUpdate.mockReturnValue({ set: mockTxSet });
  mockTxSet.mockReturnValue({ where: mockTxWhere });
  mockTxWhere.mockResolvedValue([]);
}

vi.mock('../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: async (fn: Function) =>
      fn({
        insert: (...args: unknown[]) => mockTxInsert(...args),
        update: (...args: unknown[]) => mockTxUpdate(...args),
      }),
  },
}));

vi.mock('./DocumentNumberSeriesService', () => ({
  DocumentNumberSeriesService: {
    getNextNumber: vi.fn().mockResolvedValue('10000001'),
  },
}));

// Import AFTER mocking
import { JournalEntryService } from './JournalEntryService';
import { DocumentNumberSeriesService } from './DocumentNumberSeriesService';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ACCOUNT_A = '00000000-0000-0000-0000-00000000a001';
const ACCOUNT_B = '00000000-0000-0000-0000-00000000a002';

function mockFindByIdResult(record: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(record ? [record] : []),
      }),
    }),
  });
}

/** Mock a db.select chain for posting period or account validation queries */
function mockDbSelectChainResult(records: Record<string, unknown>[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(records),
        orderBy: mockOrderBy,
      }),
    }),
  });
}

function validCreateInput() {
  return {
    branchId: TEST_BRANCH_ID,
    postingDate: '2025-06-15',
    documentDate: '2025-06-15',
    remarks: 'Test entry',
    lines: [
      { accountId: ACCOUNT_A, debit: 100, credit: 0 },
      { accountId: ACCOUNT_B, debit: 0, credit: 100 },
    ],
  };
}

function mockOpenPeriod() {
  mockDbSelectChainResult([
    { id: 'sp1', name: 'June 2025', status: 'OPEN', isActive: true },
  ]);
}

function mockPostableAccount() {
  mockDbSelectChainResult([
    { id: ACCOUNT_A, isPostable: true, isActive: true, code: '1000' },
  ]);
}

function mockBothAccountsPostable() {
  // Account A
  mockDbSelectChainResult([
    { id: ACCOUNT_A, isPostable: true, isActive: true, code: '1000' },
  ]);
  // Account B
  mockDbSelectChainResult([
    { id: ACCOUNT_B, isPostable: true, isActive: true, code: '2000' },
  ]);
}

const sampleEntry = {
  id: 'je-1',
  tenantId: TEST_TENANT_A,
  branchId: TEST_BRANCH_ID,
  code: '10000001',
  status: 'POSTED',
  totalDebit: '100',
  totalCredit: '100',
  version: 1,
  reversedById: null,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('JournalEntryService', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockReset();
    mockWhere.mockReset();
    mockOrderBy.mockReset();
    mockLimit.mockReset();
    mockOffset.mockReset();
    mockReturning.mockReset();
    mockInsert.mockReset();
    mockValues.mockReset();
    mockUpdate.mockReset();
    mockSet.mockReset();
    mockLeftJoin.mockReset();
    mockTxInsert.mockReset();
    mockTxValues.mockReset();
    mockTxReturning.mockReset();
    mockTxUpdate.mockReset();
    mockTxSet.mockReset();
    mockTxWhere.mockReset();
    vi.mocked(DocumentNumberSeriesService.getNextNumber).mockReset();
    vi.mocked(DocumentNumberSeriesService.getNextNumber).mockResolvedValue('10000001');
    setupChain();
  });

  // ─── list ─────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results', async () => {
      // COUNT query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });
      // DATA query
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([sampleEntry]);

      const result = await JournalEntryService.list(TEST_TENANT_A, { page: 1, limit: 20 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by status, branchId, sourceType, and date range', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockOffset.mockResolvedValueOnce([]);

      const result = await JournalEntryService.list(TEST_TENANT_A, {
        page: 1,
        limit: 10,
        status: 'POSTED',
        branchId: TEST_BRANCH_ID,
        sourceType: 'MANUAL',
        postingDateFrom: '2025-01-01',
        postingDateTo: '2025-12-31',
      });

      expect(result.items).toEqual([]);
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns entry with lines', async () => {
      // findById
      mockFindByIdResult(sampleEntry);
      // lines query: select().from().leftJoin().where().orderBy()
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockFrom.mockReturnValueOnce({ leftJoin: mockLeftJoin });
      mockLeftJoin.mockReturnValueOnce({ where: mockWhere });
      mockWhere.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([{ id: 'line-1' }]) });

      const result = await JournalEntryService.getById(TEST_TENANT_A, 'je-1');
      expect(result.id).toBe('je-1');
      expect(result.lines).toEqual([{ id: 'line-1' }]);
    });

    it('throws NotFoundError when entry not found', async () => {
      mockFindByIdResult(null);

      await expect(
        JournalEntryService.getById(TEST_TENANT_A, 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('validates posting period before creating', async () => {
      // No posting period found
      mockDbSelectChainResult([]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow('No posting period found');
    });

    it('validates accounts are postable', async () => {
      mockOpenPeriod();
      // Account A doesn't exist
      mockDbSelectChainResult([]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow(/does not exist/);
    });

    it('enforces golden rule (total debit = total credit)', async () => {
      mockOpenPeriod();
      mockBothAccountsPostable();

      const input = {
        ...validCreateInput(),
        lines: [
          { accountId: ACCOUNT_A, debit: 100, credit: 0 },
          { accountId: ACCOUNT_B, debit: 0, credit: 50 }, // mismatch
        ],
      };

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, input),
      ).rejects.toThrow('Total debit must equal total credit');
    });

    it('throws ValidationError when debit != credit', async () => {
      mockOpenPeriod();
      mockBothAccountsPostable();

      const input = {
        ...validCreateInput(),
        lines: [
          { accountId: ACCOUNT_A, debit: 200, credit: 0 },
          { accountId: ACCOUNT_B, debit: 0, credit: 100 },
        ],
      };

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, input),
      ).rejects.toThrow(ValidationError);
    });

    it('generates document number via DocumentNumberSeriesService', async () => {
      mockOpenPeriod();
      mockBothAccountsPostable();

      // tx insert header returns entry
      mockTxReturning.mockResolvedValueOnce([sampleEntry]);

      await JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput());

      expect(DocumentNumberSeriesService.getNextNumber).toHaveBeenCalledWith(
        TEST_TENANT_A,
        TEST_BRANCH_ID,
        'JOURNAL_ENTRY',
      );
    });

    it('inserts header + lines in transaction', async () => {
      mockOpenPeriod();
      mockBothAccountsPostable();

      mockTxReturning.mockResolvedValueOnce([sampleEntry]);

      const result = await JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput());

      expect(result).toEqual(sampleEntry);
      // header insert + lines insert = 2 calls
      expect(mockTxInsert).toHaveBeenCalledTimes(2);
    });

    it('throws ValidationError when posting period not found', async () => {
      mockDbSelectChainResult([]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when posting period is CLOSED', async () => {
      mockDbSelectChainResult([
        { id: 'sp1', name: 'June 2025', status: 'CLOSED', isActive: true },
      ]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow(/CLOSED/);
    });

    it('throws ValidationError when account does not exist', async () => {
      mockOpenPeriod();
      mockDbSelectChainResult([]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when account is not postable', async () => {
      mockOpenPeriod();
      mockDbSelectChainResult([
        { id: ACCOUNT_A, isPostable: false, isActive: true, code: '1000' },
      ]);

      await expect(
        JournalEntryService.create(TEST_TENANT_A, TEST_USER_ID, validCreateInput()),
      ).rejects.toThrow(/not postable/);
    });
  });

  // ─── reverse ──────────────────────────────────────────────────────────────

  describe('reverse', () => {
    const reverseInput = { reversalDate: '2025-06-20', version: 1, remarks: 'Correction' };

    it('validates original is POSTED', async () => {
      mockFindByIdResult({ ...sampleEntry, status: 'REVERSED' });

      await expect(
        JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', reverseInput),
      ).rejects.toThrow('Only POSTED entries can be reversed');
    });

    it('throws ValidationError when not POSTED', async () => {
      mockFindByIdResult({ ...sampleEntry, status: 'REVERSED' });

      await expect(
        JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', reverseInput),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when already reversed', async () => {
      mockFindByIdResult({ ...sampleEntry, status: 'POSTED', reversedById: 'je-99' });

      await expect(
        JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', reverseInput),
      ).rejects.toThrow('already been reversed');
    });

    it('checks optimistic locking (version mismatch)', async () => {
      mockFindByIdResult({ ...sampleEntry, status: 'POSTED', version: 2 });

      await expect(
        JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', { ...reverseInput, version: 1 }),
      ).rejects.toThrow(ConflictError);
    });

    it('creates reversal entry with swapped debits/credits', async () => {
      // findById original
      mockFindByIdResult({ ...sampleEntry, status: 'POSTED', version: 1 });

      // validatePostingPeriod for reversal date
      mockDbSelectChainResult([
        { id: 'sp2', name: 'June 2025', status: 'OPEN', isActive: true },
      ]);

      // fetch original lines: db.select().from().where().orderBy()
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockFrom.mockReturnValueOnce({ where: mockWhere });
      mockWhere.mockReturnValueOnce({
        orderBy: vi.fn().mockResolvedValue([
          { id: 'line-1', accountId: ACCOUNT_A, debit: '100', credit: '0', remarks: null, remarksAr: null },
          { id: 'line-2', accountId: ACCOUNT_B, debit: '0', credit: '100', remarks: null, remarksAr: null },
        ]),
      });

      // DocumentNumberSeriesService for reversal code
      vi.mocked(DocumentNumberSeriesService.getNextNumber).mockResolvedValueOnce('10000002');

      // tx: insert reversal header
      const reversalEntry = { ...sampleEntry, id: 'je-2', code: '10000002', sourceType: 'REVERSAL' };
      mockTxReturning.mockResolvedValueOnce([reversalEntry]);

      const result = await JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', reverseInput);

      expect(result.id).toBe('je-2');
      // 2 inserts (header + lines) and 1 update (mark original)
      expect(mockTxInsert).toHaveBeenCalledTimes(2);
      expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    });

    it('marks original as REVERSED', async () => {
      mockFindByIdResult({ ...sampleEntry, status: 'POSTED', version: 1 });
      mockDbSelectChainResult([
        { id: 'sp2', name: 'June 2025', status: 'OPEN', isActive: true },
      ]);
      // original lines
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockFrom.mockReturnValueOnce({ where: mockWhere });
      mockWhere.mockReturnValueOnce({
        orderBy: vi.fn().mockResolvedValue([
          { id: 'line-1', accountId: ACCOUNT_A, debit: '100', credit: '0', remarks: null, remarksAr: null },
        ]),
      });

      vi.mocked(DocumentNumberSeriesService.getNextNumber).mockResolvedValueOnce('10000002');
      const reversalEntry = { ...sampleEntry, id: 'je-2', code: '10000002' };
      mockTxReturning.mockResolvedValueOnce([reversalEntry]);

      await JournalEntryService.reverse(TEST_TENANT_A, TEST_USER_ID, 'je-1', reverseInput);

      expect(mockTxSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REVERSED', reversedById: 'je-2' }),
      );
    });
  });

  // ─── getBySourceDocument ──────────────────────────────────────────────────

  describe('getBySourceDocument', () => {
    it('returns entries by sourceType and sourceId', async () => {
      mockSelect.mockReturnValueOnce({ from: mockFrom });
      mockFrom.mockReturnValueOnce({ where: mockWhere });
      mockWhere.mockReturnValueOnce({
        orderBy: vi.fn().mockResolvedValue([sampleEntry]),
      });

      const result = await JournalEntryService.getBySourceDocument(
        TEST_TENANT_A,
        'SALES_INVOICE',
        'inv-1',
      );

      expect(result).toEqual([sampleEntry]);
    });
  });
});
