import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../test/createTestApp';
import itemsRouter from './items';
import { TEST_TENANT_A } from '../../test/helpers';

// ─── Mock ItemService ────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockUploadImage = vi.fn();
const mockRemoveImage = vi.fn();

vi.mock('../../services/ItemService', () => ({
  ItemService: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    uploadImage: (...args: unknown[]) => mockUploadImage(...args),
    removeImage: (...args: unknown[]) => mockRemoveImage(...args),
  },
}));

// Mock upload middleware to avoid filesystem issues in tests
vi.mock('../../middleware/uploadMiddleware', () => ({
  createUpload: () => ({
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function app(options = {}) {
  return createTestApp(itemsRouter, { tenantId: TEST_TENANT_A, ...options });
}

function createTestItem(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: TEST_TENANT_A,
    code: 'ITM-00001',
    name: 'Test Item',
    nameAr: null,
    description: null,
    itemType: 'ITEM',
    itemGroupId: null,
    isInventoryItem: true,
    isSalesItem: true,
    isPurchaseItem: true,
    isCounterSell: false,
    inventoryUomId: '00000000-0000-0000-0000-000000000300',
    purchaseUomId: null,
    purchaseUomFactor: 1,
    salesUomId: null,
    salesUomFactor: 1,
    standardCost: null,
    lastPurchasePrice: null,
    defaultSellingPrice: null,
    barcode: null,
    minimumStock: null,
    maximumStock: null,
    defaultWarehouseId: null,
    preferredVendor: null,
    imageUrl: null,
    version: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const sampleItem = createTestItem({ id: 'item-1' });

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /  (list)', () => {
  it('returns 200 with paginated data', async () => {
    mockList.mockResolvedValue({
      items: [sampleItem],
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
      .get('/?search=needle&page=2&limit=10')
      .expect(200);

    expect(mockList).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ search: 'needle', page: 2, limit: 10 }),
    );
  });
});

describe('GET /:id  (get by ID)', () => {
  it('returns 200 with item data', async () => {
    mockGetById.mockResolvedValue(sampleItem);

    const res = await request(app()).get('/item-1').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('ITM-00001');
    expect(mockGetById).toHaveBeenCalledWith(TEST_TENANT_A, 'item-1');
  });

  it('returns 404 when item not found', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockGetById.mockRejectedValue(new NotFoundError('Item', 'bad-id'));

    const res = await request(app()).get('/bad-id').expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('POST /  (create)', () => {
  const validInput = {
    name: 'New Item',
    itemType: 'ITEM',
    inventoryUomId: '00000000-0000-0000-0000-000000000300',
  };

  it('returns 201 with created item', async () => {
    mockCreate.mockResolvedValue(createTestItem({ ...validInput, id: 'item-2' }));

    const res = await request(app())
      .post('/')
      .send(validInput)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      expect.objectContaining({ name: 'New Item', itemType: 'ITEM' }),
    );
  });

  it('returns 400 on missing required name', async () => {
    const res = await request(app())
      .post('/')
      .send({ itemType: 'ITEM' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on missing required itemType', async () => {
    const res = await request(app())
      .post('/')
      .send({ name: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when code conflict', async () => {
    const { ConflictError } = await import('../../core/errors/AppError');
    mockCreate.mockRejectedValue(
      new ConflictError("Item with code 'ITM-00001' already exists"),
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
  it('returns 200 with updated item', async () => {
    const updated = createTestItem({ id: 'item-1', name: 'Updated Item', version: 2 });
    mockUpdate.mockResolvedValue(updated);

    const res = await request(app())
      .put('/item-1')
      .send({ name: 'Updated Item', version: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Item');
    expect(mockUpdate).toHaveBeenCalledWith(
      TEST_TENANT_A,
      'item-1',
      expect.objectContaining({ name: 'Updated Item', version: 1 }),
    );
  });

  it('returns 404 when updating non-existent item', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockUpdate.mockRejectedValue(new NotFoundError('Item', 'bad-id'));

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
      .delete('/item-1')
      .expect(204);

    expect(res.body).toEqual({});
    expect(mockRemove).toHaveBeenCalledWith(TEST_TENANT_A, 'item-1');
  });

  it('returns 404 when deleting non-existent item', async () => {
    const { NotFoundError } = await import('../../core/errors/AppError');
    mockRemove.mockRejectedValue(new NotFoundError('Item', 'bad-id'));

    const res = await request(app())
      .delete('/bad-id')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Auth guard (unauthenticated)', () => {
  it('returns 401 when no auth context is injected', async () => {
    const unauthApp = createTestApp(itemsRouter, { authenticated: false });

    const res = await request(unauthApp).get('/').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
