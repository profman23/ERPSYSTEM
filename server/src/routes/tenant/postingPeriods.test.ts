import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import postingPeriodsRouter from './postingPeriods';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock PostingPeriodService ───────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockGetSubPeriods = vi.fn();
const mockUpdateSubPeriod = vi.fn();

vi.mock('../../services/PostingPeriodService', () => ({
  PostingPeriodService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    getSubPeriods: (...args: unknown[]) => mockGetSubPeriods(...args),
    updateSubPeriod: (...args: unknown[]) => mockUpdateSubPeriod(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(postingPeriodsRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestPeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    fiscalYear: 2025,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'OPEN',
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function createTestSubPeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    postingPeriodId: 'pp-1',
    periodNumber: 1,
    name: 'January 2025',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    status: 'OPEN',
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const samplePeriod = createTestPeriod({ id: 'pp-1' });
const sampleSubPeriod = createTestSubPeriod({ id: 'sp-1' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list fiscal years)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [samplePeriod],
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

  it('passes fiscal year filter', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await request(app())
      .get('/?fiscalYear=2025')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ fiscalYear: 2025 }),
    );
  });
});

describe('GET /:id  (get fiscal year by ID)', () => {
  it('returns 200 with period data', async () => {
    mockGetById.mockResolvedValue(samplePeriod);

    const res = await request(app()).get('/pp-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fiscalYear).toBe(2025);
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'pp-1');
  });

  it('returns 404 when period not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('PostingPeriod', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create fiscal year)', () => {
  const validInput = {
    fiscalYear: 2026,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  };

  it('returns 201 with created period', async () => {
    mockCreate.mockResolvedValue(createTestPeriod({ ...validInput, id: 'pp-2' }));

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ fiscalYear: 2026, startDate: '2026-01-01' }),
    );
  });

  it('returns 400 on missing startDate', async () => {
    const res = await request(app())
      .post('/')
      .send({ fiscalYear: 2026, endDate: '2026-12-31' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing endDate', async () => {
    const res = await request(app())
      .post('/')
      .send({ fiscalYear: 2026, startDate: '2026-01-01' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when endDate is before startDate', async () => {
    const res = await request(app())
      .post('/')
      .send({ fiscalYear: 2026, startDate: '2026-12-31', endDate: '2026-01-01' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when fiscal year already exists', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError('Fiscal year 2025 already exists'),
    );

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CONFLICT');
  });
});

describe('GET /:id/sub-periods  (list sub-periods)', () => {
  it('returns 200 with paginated sub-periods', async () => {
    mockGetSubPeriods.mockResolvedValue({
      items: [sampleSubPeriod],
      total: 1,
      page: 1,
      limit: 20,
    });

    const res = await request(app()).get('/pp-1/sub-periods').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(mockGetSubPeriods).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'pp-1',
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });
});

describe('PUT /sub-periods/:subId  (update sub-period)', () => {
  it('returns 200 with updated sub-period', async () => {
    const updated = createTestSubPeriod({ id: 'sp-1', status: 'CLOSED', version: 2 });
    mockUpdateSubPeriod.mockResolvedValue(updated);

    const res = await request(app())
      .put('/sub-periods/sp-1')
      .send({ status: 'CLOSED', version: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CLOSED');
    expect(mockUpdateSubPeriod).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'sp-1',
      expect.objectContaining({ status: 'CLOSED', version: 1 }),
    );
  });

  it('returns 400 when version is missing', async () => {
    const res = await request(app())
      .put('/sub-periods/sp-1')
      .send({ status: 'CLOSED' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockUpdateSubPeriod).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid status value', async () => {
    const res = await request(app())
      .put('/sub-periods/sp-1')
      .send({ status: 'INVALID', version: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when sub-period not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdateSubPeriod.mockRejectedValue(new NotFoundError('SubPeriod', 'bad-id'));

    const res = await request(app())
      .put('/sub-periods/bad-id')
      .send({ status: 'CLOSED', version: 1 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(postingPeriodsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
