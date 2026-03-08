import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import journalEntriesRouter from './journalEntries';
import { TEST_TENANT_A, TEST_USER_ID } from '../../test/helpers';

// ─── Mock JournalEntryService ────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockReverse = vi.fn();

vi.mock('../../services/JournalEntryService', () => ({
  JournalEntryService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    reverse: (...args: unknown[]) => mockReverse(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(journalEntriesRouter, { tenantId: TEST_TENANT_A, ...options });
}

const VALID_ACCOUNT_A = '00000000-0000-0000-0000-000000000501';
const VALID_ACCOUNT_B = '00000000-0000-0000-0000-000000000502';
const VALID_BRANCH = '00000000-0000-0000-0000-000000000100';

function createTestEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    branchId: VALID_BRANCH,
    documentNumber: '10000001',
    postingDate: '2025-06-15',
    documentDate: '2025-06-15',
    dueDate: null,
    remarks: null,
    reference: null,
    status: 'POSTED',
    sourceType: 'MANUAL',
    sourceId: null,
    reversalId: null,
    totalDebit: 1000,
    totalCredit: 1000,
    createdBy: TEST_USER_ID,
    version: 1,
    isActive: true,
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2025-06-15'),
    lines: [
      { accountId: VALID_ACCOUNT_A, debit: 1000, credit: 0 },
      { accountId: VALID_ACCOUNT_B, debit: 0, credit: 1000 },
    ],
    ...overrides,
  };
}

const sampleEntry = createTestEntry({ id: 'je-1' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleEntry],
      total: 1,
      page: 1,
      limit: 20,
    });

    const res = await request(app()).get('/').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('passes search and filter params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await request(app())
      .get('/?search=ref&status=POSTED&branchId=' + VALID_BRANCH)
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({
        search: 'ref',
        status: 'POSTED',
        branchId: VALID_BRANCH,
      }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with entry data and lines', async () => {
    mockGetById.mockResolvedValue(sampleEntry);

    const res = await request(app()).get('/je-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('POSTED');
    expect(res.body.data.lines).toHaveLength(2);
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'je-1');
  });

  it('returns 404 when entry not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('JournalEntry', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  const validInput = {
    branchId: VALID_BRANCH,
    postingDate: '2025-06-15',
    documentDate: '2025-06-15',
    lines: [
      { accountId: VALID_ACCOUNT_A, debit: 500, credit: 0 },
      { accountId: VALID_ACCOUNT_B, debit: 0, credit: 500 },
    ],
  };

  it('returns 201 with created entry', async () => {
    mockCreate.mockResolvedValue(createTestEntry({ id: 'je-2' }));

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      TEST_USER_ID,
      expect.objectContaining({ branchId: VALID_BRANCH, postingDate: '2025-06-15' }),
    );
  });

  it('returns 400 on missing branchId', async () => {
    const res = await request(app())
      .post('/')
      .send({
        postingDate: '2025-06-15',
        documentDate: '2025-06-15',
        lines: [
          { accountId: VALID_ACCOUNT_A, debit: 500, credit: 0 },
          { accountId: VALID_ACCOUNT_B, debit: 0, credit: 500 },
        ],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing postingDate', async () => {
    const res = await request(app())
      .post('/')
      .send({
        branchId: VALID_BRANCH,
        documentDate: '2025-06-15',
        lines: [
          { accountId: VALID_ACCOUNT_A, debit: 500, credit: 0 },
          { accountId: VALID_ACCOUNT_B, debit: 0, credit: 500 },
        ],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when lines has fewer than 2 entries', async () => {
    const res = await request(app())
      .post('/')
      .send({
        branchId: VALID_BRANCH,
        postingDate: '2025-06-15',
        documentDate: '2025-06-15',
        lines: [{ accountId: VALID_ACCOUNT_A, debit: 500, credit: 0 }],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when debit and credit are both > 0 on a line', async () => {
    const res = await request(app())
      .post('/')
      .send({
        branchId: VALID_BRANCH,
        postingDate: '2025-06-15',
        documentDate: '2025-06-15',
        lines: [
          { accountId: VALID_ACCOUNT_A, debit: 500, credit: 500 },
          { accountId: VALID_ACCOUNT_B, debit: 0, credit: 500 },
        ],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when total debit does not equal total credit', async () => {
    const res = await request(app())
      .post('/')
      .send({
        branchId: VALID_BRANCH,
        postingDate: '2025-06-15',
        documentDate: '2025-06-15',
        lines: [
          { accountId: VALID_ACCOUNT_A, debit: 500, credit: 0 },
          { accountId: VALID_ACCOUNT_B, debit: 0, credit: 300 },
        ],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /:id/reverse  (reverse entry)', () => {
  const validReversal = {
    reversalDate: '2025-06-20',
    version: 1,
  };

  it('returns 200 with reversed entry', async () => {
    const reversed = createTestEntry({ id: 'je-1', status: 'REVERSED' });
    mockReverse.mockResolvedValue(reversed);

    const res = await request(app())
      .put('/je-1/reverse')
      .send(validReversal)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REVERSED');
    expect(mockReverse).toHaveBeenCalledWith(
      TEST_TENANT_A,
      TEST_USER_ID,
      'je-1',
      expect.objectContaining({ reversalDate: '2025-06-20', version: 1 }),
    );
  });

  it('returns 400 on missing reversalDate', async () => {
    const res = await request(app())
      .put('/je-1/reverse')
      .send({ version: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockReverse).not.toHaveBeenCalled();
  });

  it('returns 400 on missing version', async () => {
    const res = await request(app())
      .put('/je-1/reverse')
      .send({ reversalDate: '2025-06-20' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when entry not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockReverse.mockRejectedValue(new NotFoundError('JournalEntry', 'bad-id'));

    const res = await request(app())
      .put('/bad-id/reverse')
      .send(validReversal)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 409 when entry already reversed', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockReverse.mockRejectedValue(
      new ConflictError('Journal entry is already reversed'),
    );

    const res = await request(app())
      .put('/je-1/reverse')
      .send(validReversal)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('No PUT/:id or DELETE endpoints (immutable)', () => {
  it('PUT /:id returns 404 (no update endpoint)', async () => {
    await request(app())
      .put('/je-1')
      .send({ remarks: 'test' })
      .expect(404);
  });

  it('DELETE /:id returns 404 (no delete endpoint)', async () => {
    await request(app())
      .delete('/je-1')
      .expect(404);
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(journalEntriesRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
