import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import documentNumberSeriesRouter from './documentNumberSeries';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock DocumentNumberSeriesService ────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../services/DocumentNumberSeriesService', () => ({
  DocumentNumberSeriesService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(documentNumberSeriesRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestSeries(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    branchId: '00000000-0000-0000-0000-000000000100',
    documentType: 'SALES_INVOICE',
    prefix: null,
    separator: '-',
    nextNumber: 10000001,
    padding: 8,
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleSeries = createTestSeries({ id: 'dns-1' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleSeries],
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
      .get('/?search=invoice&documentType=SALES_INVOICE&branchId=00000000-0000-0000-0000-000000000100')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({
        search: 'invoice',
        documentType: 'SALES_INVOICE',
        branchId: '00000000-0000-0000-0000-000000000100',
      }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with series data', async () => {
    mockGetById.mockResolvedValue(sampleSeries);

    const res = await request(app()).get('/dns-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.documentType).toBe('SALES_INVOICE');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'dns-1');
  });

  it('returns 404 when series not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('DocumentNumberSeries', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated series', async () => {
    const updated = createTestSeries({ id: 'dns-1', prefix: 'INV', version: 2 });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/dns-1')
      .send({ prefix: 'INV', version: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.prefix).toBe('INV');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'dns-1',
      expect.objectContaining({ prefix: 'INV', version: 1 }),
    );
  });

  it('returns 400 when version is missing', async () => {
    const res = await request(app())
      .put('/dns-1')
      .send({ prefix: 'INV' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when updating non-existent series', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('DocumentNumberSeries', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ prefix: 'X', version: 1 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns 409 on optimistic locking conflict', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(
      new ConflictError('Record was modified by another user'),
    );

    const res = await request(app())
      .put('/dns-1')
      .send({ prefix: 'X', version: 1 })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('No POST or DELETE endpoints', () => {
  it('POST / returns 404 (not implemented)', async () => {
    await request(app())
      .post('/')
      .send({ documentType: 'SALES_INVOICE' })
      .expect(404);
  });

  it('DELETE /:id returns 404 (not implemented)', async () => {
    await request(app())
      .delete('/dns-1')
      .expect(404);
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(documentNumberSeriesRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
