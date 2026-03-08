import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import chartOfAccountsRouter from './chartOfAccounts';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock ChartOfAccountsService ─────────────────────────────────────────────

const mockList = vi.fn();
const mockGetTree = vi.fn();
const mockGetPostableAccounts = vi.fn();
const mockGetById = vi.fn();
const mockGetAncestors = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockMove = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/ChartOfAccountsService', () => ({
  ChartOfAccountsService: {
    list: (...args: unknown[]) => mockList(...args),
    getTree: (...args: unknown[]) => mockGetTree(...args),
    getPostableAccounts: (...args: unknown[]) => mockGetPostableAccounts(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    getAncestors: (...args: unknown[]) => mockGetAncestors(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    move: (...args: unknown[]) => mockMove(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(chartOfAccountsRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    code: '1000',
    name: 'Cash',
    nameAr: null,
    description: null,
    parentId: null,
    accountType: 'ASSET',
    normalBalance: 'DEBIT',
    isPostable: true,
    isCashAccount: true,
    isBankAccount: false,
    currency: null,
    metadata: null,
    level: 0,
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleAccount = createTestAccount({ id: 'acc-1' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleAccount],
      total: 1,
      page: 1,
      limit: 100,
    });

    const res = await request(app()).get('/').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ page: 1, limit: 100 }),
    );
  });

  it('passes search and filter params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await request(app())
      .get('/?search=cash&accountType=ASSET&limit=20')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'cash', accountType: 'ASSET', limit: 20 }),
    );
  });
});

describe('GET /tree  (tree structure)', () => {
  it('returns 200 with tree data', async () => {
    const tree = [{ ...sampleAccount, children: [] }];
    mockGetTree.mockResolvedValue(tree);

    const res = await request(app()).get('/tree').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockGetTree).toHaveBeenCalledWith(TEST_TENANT_A, expect.any(Object));
  });
});

describe('GET /postable  (postable accounts)', () => {
  it('returns 200 with postable accounts', async () => {
    mockGetPostableAccounts.mockResolvedValue([sampleAccount]);

    const res = await request(app()).get('/postable').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockGetPostableAccounts).toHaveBeenCalledWith(TEST_TENANT_A, undefined);
  });

  it('passes accountType filter', async () => {
    mockGetPostableAccounts.mockResolvedValue([]);

    await request(app()).get('/postable?accountType=EXPENSE').expect(200);

    expect(mockGetPostableAccounts).toHaveBeenCalledWith(TEST_TENANT_A, 'EXPENSE');
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with account data', async () => {
    mockGetById.mockResolvedValue(sampleAccount);

    const res = await request(app()).get('/acc-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('1000');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'acc-1');
  });

  it('returns 404 when account not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('ChartOfAccount', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('GET /:id/ancestors  (breadcrumb trail)', () => {
  it('returns 200 with ancestors', async () => {
    mockGetAncestors.mockResolvedValue([sampleAccount]);

    const res = await request(app()).get('/acc-1/ancestors').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockGetAncestors).toHaveBeenCalledWith(TEST_TENANT_A, 'acc-1');
  });
});

describe('POST /  (create)', () => {
  const validInput = {
    code: '2000',
    name: 'Bank Account',
    accountType: 'ASSET',
  };

  it('returns 201 with created account', async () => {
    mockCreate.mockResolvedValue(createTestAccount({ ...validInput, id: 'acc-2' }));

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: '2000', name: 'Bank Account', accountType: 'ASSET' }),
    );
  });

  it('returns 400 on missing required code', async () => {
    const res = await request(app())
      .post('/')
      .send({ name: 'Test', accountType: 'ASSET' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing required name', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '3000', accountType: 'ASSET' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on missing required accountType', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '3000', name: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid accountType', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '3000', name: 'Test', accountType: 'INVALID' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Account with code '2000' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated account', async () => {
    const updated = createTestAccount({ id: 'acc-1', name: 'Updated Cash' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/acc-1')
      .send({ name: 'Updated Cash' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Cash');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'acc-1',
      expect.objectContaining({ name: 'Updated Cash' }),
    );
  });

  it('returns 404 when updating non-existent account', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('ChartOfAccount', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ name: 'Nope' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PUT /:id/move  (re-parent)', () => {
  it('returns 200 with moved account', async () => {
    const moved = createTestAccount({ id: 'acc-1', parentId: 'acc-2' });
    mockMove.mockResolvedValue(moved);

    const res = await request(app())
      .put('/acc-1/move')
      .send({ newParentId: '00000000-0000-0000-0000-000000000099' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockMove).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'acc-1',
      '00000000-0000-0000-0000-000000000099',
    );
  });

  it('returns 200 when moving to root (null parent)', async () => {
    const moved = createTestAccount({ id: 'acc-1', parentId: null });
    mockMove.mockResolvedValue(moved);

    const res = await request(app())
      .put('/acc-1/move')
      .send({ newParentId: null })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockMove).toHaveBeenCalledWith(TEST_TENANT_A, 'acc-1', null);
  });

  it('returns 400 when newParentId is missing', async () => {
    const res = await request(app())
      .put('/acc-1/move')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockMove).not.toHaveBeenCalled();
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/acc-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'acc-1');
  });

  it('returns 404 when deleting non-existent account', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('ChartOfAccount', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(chartOfAccountsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
