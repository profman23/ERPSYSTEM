/**
 * MSW Request Handlers — Mock API responses for frontend tests
 */
import { http, HttpResponse } from 'msw';

const API = 'http://localhost:5500/api/v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paginated<T>(items: T[], page = 1, limit = 20) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data: {
      data: items.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  };
}

function single<T>(data: T) {
  return { success: true, data };
}

function error(message: string, code: string, status: number) {
  return HttpResponse.json({ success: false, error: message, code }, { status });
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SPECIES = [
  { id: 's1', tenantId: 't1', code: 'DOG', name: 'Dog', nameAr: 'كلب', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { id: 's2', tenantId: 't1', code: 'CAT', name: 'Cat', nameAr: 'قط', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
];

const BREEDS = [
  { id: 'b1', tenantId: 't1', speciesId: 's1', code: 'LAB', name: 'Labrador', isActive: true },
  { id: 'b2', tenantId: 't1', speciesId: 's1', code: 'GSD', name: 'German Shepherd', isActive: true },
];

const CLIENTS = [
  { id: 'c1', tenantId: 't1', code: 'CLT-00001', firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '123456', isActive: true },
];

const PATIENTS = [
  { id: 'p1', tenantId: 't1', code: 'PAT-000001', name: 'Rex', speciesId: 's1', clientId: 'c1', isActive: true },
];

const ROLES = [
  { id: 'r1', tenantId: 't1', roleCode: 'ADMIN', roleName: 'Admin', roleType: 'BUILT_IN', isActive: 'true', isProtected: 'false', isDefault: 'false', usersCount: 0, permissionsCount: 0 },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Species ──
  http.get(`${API}/tenant/species`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 20);
    const search = url.searchParams.get('search') || '';
    let items = SPECIES;
    if (search) items = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    return HttpResponse.json(paginated(items, page, limit));
  }),
  http.get(`${API}/tenant/species/:id`, ({ params }) => {
    const item = SPECIES.find(s => s.id === params.id);
    if (!item) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single(item));
  }),
  http.post(`${API}/tenant/species`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const created = { id: 'new-1', tenantId: 't1', ...body, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return HttpResponse.json(single(created), { status: 201 });
  }),
  http.put(`${API}/tenant/species/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const existing = SPECIES.find(s => s.id === params.id);
    if (!existing) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single({ ...existing, ...body, updatedAt: new Date().toISOString() }));
  }),
  http.delete(`${API}/tenant/species/:id`, ({ params }) => {
    const existing = SPECIES.find(s => s.id === params.id);
    if (!existing) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single({ id: params.id }));
  }),

  // ── Breeds ──
  http.get(`${API}/tenant/breeds`, ({ request }) => {
    const url = new URL(request.url);
    const speciesId = url.searchParams.get('speciesId');
    let items = BREEDS;
    if (speciesId) items = items.filter(b => b.speciesId === speciesId);
    return HttpResponse.json(paginated(items));
  }),
  http.get(`${API}/tenant/breeds/:id`, ({ params }) => {
    const item = BREEDS.find(b => b.id === params.id);
    if (!item) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single(item));
  }),
  http.post(`${API}/tenant/breeds`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'new-b1', tenantId: 't1', ...body, isActive: true }), { status: 201 });
  }),
  http.put(`${API}/tenant/breeds/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const existing = BREEDS.find(b => b.id === params.id);
    if (!existing) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single({ ...existing, ...body }));
  }),
  http.delete(`${API}/tenant/breeds/:id`, ({ params }) => {
    const existing = BREEDS.find(b => b.id === params.id);
    if (!existing) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single({ id: params.id }));
  }),

  // ── Clients ──
  http.get(`${API}/tenant/clients`, () => HttpResponse.json(paginated(CLIENTS))),
  http.get(`${API}/tenant/clients/:id`, ({ params }) => {
    const item = CLIENTS.find(c => c.id === params.id);
    if (!item) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single(item));
  }),
  http.post(`${API}/tenant/clients`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'new-c1', tenantId: 't1', code: 'CLT-00002', ...body, isActive: true }), { status: 201 });
  }),

  // ── Patients ──
  http.get(`${API}/tenant/patients`, () => HttpResponse.json(paginated(PATIENTS))),
  http.get(`${API}/tenant/patients/:id`, ({ params }) => {
    const item = PATIENTS.find(p => p.id === params.id);
    if (!item) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single(item));
  }),
  http.post(`${API}/tenant/patients`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'new-p1', tenantId: 't1', code: 'PAT-000002', ...body, isActive: true }), { status: 201 });
  }),

  // ── Roles ──
  http.get(`${API}/tenant/roles`, () => HttpResponse.json(paginated(ROLES))),
  http.get(`${API}/tenant/roles/:id`, ({ params }) => {
    const item = ROLES.find(r => r.id === params.id);
    if (!item) return error('Not found', 'NOT_FOUND', 404);
    return HttpResponse.json(single(item));
  }),

  // ── Items ──
  http.get(`${API}/tenant/items`, () => HttpResponse.json(paginated([]))),
  http.get(`${API}/tenant/items/:id`, ({ params: _params }) => {
    return error('Not found', 'NOT_FOUND', 404);
  }),
  http.post(`${API}/tenant/items`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'new-i1', tenantId: 't1', code: 'ITM-00001', ...body, isActive: true }), { status: 201 });
  }),
  http.delete(`${API}/tenant/items/:id`, ({ params }) => {
    return HttpResponse.json(single({ id: params.id }));
  }),

  // ── Journal Entries ──
  http.get(`${API}/tenant/journal-entries`, () => HttpResponse.json(paginated([]))),
  http.post(`${API}/tenant/journal-entries`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'new-je1', tenantId: 't1', code: '10000001', status: 'POSTED', ...body }), { status: 201 });
  }),

  // ── GL Reports ──
  http.get(`${API}/tenant/gl-reports/trial-balance`, () => {
    return HttpResponse.json(single({
      fiscalYear: 2025,
      periodFrom: 1,
      periodTo: 12,
      branchId: null,
      totals: { totalDebit: '10000.0000', totalCredit: '10000.0000' },
      accounts: [],
    }));
  }),
  http.get(`${API}/tenant/gl-reports/account-ledger`, () => {
    return HttpResponse.json(single({
      account: { id: 'acc1', code: '1100', name: 'Cash', nameAr: 'نقد', accountType: 'ASSET', normalBalance: 'DEBIT' },
      entries: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      summary: { totalDebit: '0', totalCredit: '0', closingBalance: '0' },
    }));
  }),

  // ── Hierarchy ──
  http.get(`${API}/tenant/hierarchy/tree`, () => {
    return HttpResponse.json(single({
      tenant: { id: 't1', name: 'PetCare' },
      businessLines: [{ id: 'bl1', name: 'Vet Clinic', branches: [{ id: 'br1', name: 'Main Branch' }] }],
    }));
  }),

  // ── DPF Modules (permissions) ──
  http.get(`${API}/tenant/dpf/modules/tree`, () => {
    return HttpResponse.json(single([
      { id: 'm1', code: 'ADMIN', name: 'Administration', screens: [{ id: 'sc1', code: 'USERS', name: 'Users' }] },
    ]));
  }),

  // ── Auth ──
  http.post(`${API}/auth/refresh`, () => {
    return HttpResponse.json({ success: true, accessToken: 'new-token' });
  }),

  // ── User Roles ──
  http.get(`${API}/tenant/user-roles`, () => HttpResponse.json(paginated([]))),
  http.post(`${API}/tenant/user-roles`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(single({ id: 'ur1', ...body }), { status: 201 });
  }),

  // ── Audit Trail ──
  http.get(`${API}/tenant/audit-trail/:resourceType/:resourceId`, () =>
    HttpResponse.json(single([
      {
        id: 'aud_1', action: 'create', resourceType: 'species', resourceId: 'sp-1',
        userId: 'u1', userName: 'Ahmed Mohamed', userEmail: 'ahmed@petcare.vet',
        diff: null, createdAt: '2025-03-10T14:00:00.000Z',
      },
    ])),
  ),
];
