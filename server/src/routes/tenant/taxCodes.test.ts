import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import taxCodeRouter from './taxCodes';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock TaxCodeService ────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../services/TaxCodeService', () => ({
  TaxCodeService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(taxCodeRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestTaxCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tc-1',
    tenantId: TEST_TENANT_A,
    code: 'VAT15',
    name: 'VAT 15%',
    taxType: 'OUTPUT_TAX',
    rate: 15,
    calculationMethod: 'PERCENTAGE',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleTaxCode = createTestTaxCode();

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleTaxCode],
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

  it('passes search and pagination params', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 2, limit: 10 });

    await request(app())
      .get('/?search=vat&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'vat', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with tax code data', async () => {
    mockGetById.mockResolvedValue(sampleTaxCode);

    const res = await request(app()).get('/tc-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('VAT15');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'tc-1');
  });

  it('returns 404 when tax code not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('TaxCode', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  it('returns 201 with created tax code', async () => {
    const input = {
      code: 'VAT5',
      name: 'VAT 5%',
      taxType: 'OUTPUT_TAX',
      rate: 5,
    };
    mockCreate.mockResolvedValue(createTestTaxCode({ ...input, id: 'tc-2' }));

    const res = await request(app())
      .post('/')
      .send(input)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('VAT5');
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ code: 'VAT5', name: 'VAT 5%' }),
    );
  });

  it('returns 400 on invalid body (missing taxType)', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: 'TX1', name: 'Test' }) // missing required taxType
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on empty code', async () => {
    const res = await request(app())
      .post('/')
      .send({ code: '', name: 'Test', taxType: 'OUTPUT_TAX' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Tax code with code 'VAT15' already exists"),
    );

    const res = await request(app())
      .post('/')
      .send({ code: 'VAT15', name: 'VAT 15%', taxType: 'OUTPUT_TAX', rate: 15 })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('PUT /:id  (update)', () => {
  it('returns 200 with updated tax code', async () => {
    const updated = createTestTaxCode({ id: 'tc-1', name: 'Updated VAT' });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/tc-1')
      .send({ name: 'Updated VAT', version: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated VAT');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'tc-1',
      expect.objectContaining({ name: 'Updated VAT' }),
    );
  });

  it('returns 404 when updating non-existent tax code', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('TaxCode', 'bad-id'));

    const res = await request(app())
      .put('/bad-id')
      .send({ name: 'Nope', version: 1 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /:id  (soft delete)', () => {
  it('returns 204 with no body', async () => {
    mockRemove.mockResolvedValue(undefined);

    const res = await request(app())
      .delete('/tc-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'tc-1');
  });

  it('returns 404 when deleting non-existent tax code', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('TaxCode', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(taxCodeRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
