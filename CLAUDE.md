# Engineering Constitution — Veterinary ERP SaaS
# Multi-Tenant | 3000+ Tenants | Enterprise-Grade

> Read before every task. Every line of code follows these rules. No exceptions.

---

## PROJECT IDENTITY

| Key | Value |
|-----|-------|
| Type | Multi-Tenant Veterinary ERP SaaS (SAP B1 inspired) |
| Scale | 3000+ tenants, 50,000+ concurrent users |
| Stack | Express.js + TypeScript + Drizzle ORM + React 19 + TanStack Query |
| Database | PostgreSQL (Neon Serverless) + Redis (Upstash) cache |
| Auth | JWT (access 15min, refresh 7d) + AsyncLocalStorage tenant context |
| Permissions | DPF — SAP B1 AuthorizationLevel (0=None, 1=ReadOnly, 2=Full) |
| Hierarchy | System → Tenant → Business Line → Branch → User |
| Panels | System (`/system`), Admin (`/admin`), App (`/app`) |
| Languages | English + Arabic (RTL) |

---

## DEVELOPMENT ENVIRONMENT

```
Backend:    cd server && npm run dev     → http://localhost:5500
Frontend:   cd client && npm run dev     → http://localhost:5501
Migrations: cd server && npx drizzle-kit generate && npx drizzle-kit push
TypeCheck:  cd server && npx tsc --noEmit   |   cd client && npx tsc --noEmit
Tests:      cd server && npm test            |   cd client && npm test
E2E:        npm run test:e2e                 (needs running server+client+test DB)
Coverage:   cd server && npx vitest run --coverage
Package:    npm only (not yarn/pnpm)
```

### Test Credentials

| Panel | Email | Password | Tenant Code |
|-------|-------|----------|-------------|
| System | superadmin@system.local | Admin@123 | SYSTEM |
| Admin | tenantadmin@petcare.vet | Test@123 | PETCARE |
| App | doctor@petcareplus.vet | Test@123 | PETCAREPLUS |

---

## CURRENT STATE

### Built & Working
- Multi-tenant auth (JWT + refresh + AsyncLocalStorage tenant context)
- DPF permission system (6 tenant + 8 system modules, SAP B1 AuthorizationLevel)
- Tenant / BusinessLine / Branch / User CRUD — all using BaseService + BaseController
- BaseController + BaseService + AppError + ApiResponse (unified patterns)
- Drizzle relations for 40+ tables
- tenantStatusGuard middleware
- Species, Breeds (reference feature template + child entity)
- Clients, Patients (full CRUD + complex frontend forms with cascading dropdowns)
- Setup entities: UoM, Item Groups, Warehouses, Tax Codes (all with BaseService + frontend pages)
- Chart of Accounts (tree structure, AccountSelector component, 5 account types, isPostable)
- Environment validation at startup (`server/src/config/env.ts` — Zod, fail-fast)
- Composite indexes on all domain tables (21 indexes: tenant_id+is_active, tenant_id+code, FK indexes)
- BranchService, BusinessLineService, UserService (extends BaseService)
- Soft delete enforced in all services (including roleService)
- 0 production TypeScript errors
- Tiered cache: L1 (in-memory) → L2 (Redis/Upstash) → L3 (AGI Knowledge Cache) with graceful degradation
- DPF Engine optimized: 2 queries on cache miss (UNION ALL), 15min TTL, cache warming on login
- Full test infrastructure: 508 backend tests + 138 frontend tests + 25 E2E tests (Playwright)
- Redis: SCAN-based invalidation (non-blocking), legacy CacheService bridged to AGI-Ready cache
- Reusable UI: FormWizard, PhoneInput, VirtualizedList, VirtualizedTable, AccountSelector, empty/error/loading states
- Document Number Series (branch-scoped, 7 doc types, concurrent-safe SELECT FOR UPDATE + withRetry)
- Posting Periods (fiscal year + 12 monthly sub-periods, OPEN/CLOSED/LOCKED, auto-seeded per tenant)
- Journal Entries (double-entry bookkeeping, immutable documents, reversal transactions, master/detail)
- GL Engine (account_balances materialized ledger, atomic UPSERT posting on JE create/reverse, GLPostingService)
- GL Reports (Trial Balance from account_balances, Account Ledger from JE lines with running balance)
- `createFromDocument()` extensibility point for future document types (GRPO, Invoice, etc.)
- withRetry() utility for database resilience (exponential backoff + jitter, Neon cold starts, deadlocks)
- Header Toolbar (DPF-controlled quick actions, branch switching, history log, registry pattern for extensibility)
- Document History Drawer (reusable timeline component for document audit trail — created/reversed/updated)
- Audit Trail Integration (all 13 CRUD services auto-log via BaseService auditable methods, REST API, frontend hook + contextual HeaderToolbar History Log)

### NOT Built Yet (Domain Features)
- Appointments, Medical Records
- Invoices, Payments, Inventory transactions, Purchase Orders

### Recently Completed
- GL Accounting Engine Phase 1 (account_balances schema, GLPostingService atomic posting, GLReportService Trial Balance + Account Ledger, frontend pages, DPF screens)
- Audit Trail Integration (BaseService auditable methods + audit trail API + PageResourceContext + useAuditTrail hook + HeaderToolbar History Log)
- Journal Entries (double-entry bookkeeping engine, full list/create/detail/reverse workflow)
- Financial document UI pattern (SAP B1 style: Create + Detail same layout, shared reversal components)
- Item Master Data (CRUD + frontend form with image upload)
- Bilingual Error Message System (Code + Params pattern — 37 MessageErrorCodes, ~55 service throws migrated, frontend i18n resolution)
- Comprehensive test suite: 521 backend (39 files) + 154 frontend (25 files) + 25 E2E Playwright
- CI/CD: GitHub Actions workflow (backend + frontend + E2E pipeline)
- Deployment config: Render blueprint (staging + production) + Neon 3-environment setup

### Known Technical Debt
- Legacy controllers still in use: `roleController` (Phase 2B deferred, no audit trail), `usersController` (used by system panel)
- `systemTenantController` / `hierarchyController` use next(error) pattern (functional, not yet BaseController)
- DPF Engine: 2 queries on cache miss (goal is 1 — needs single JOIN replacing UNION ALL)
- Legacy Phase 5 security tests (18 tests) fail — need DB connection, not updated for current middleware
- ~260 `console.log` remaining in non-critical files (fix incrementally as files are touched)
- 101 TypeScript errors in test/debug utility scripts only (not production code)
- Frontend full test suite OOMs on Windows (runs in batches of 5 files) — CI on Ubuntu handles it fine

---

## GIT & CI/CD

- **Commits:** Short imperative English: `Add patient schema and CRUD endpoints`
- **Branches:** `feature/{entity}`, `fix/{issue}`, `refactor/{scope}`
- **Never commit:** `.env`, `node_modules/`, credentials, binaries, `e2e/.auth/`
- **Always commit:** schemas, migrations, shared types, `package-lock.json`

### CI/CD Pipeline (`.github/workflows/test.yml`)

```
Push/PR → Backend tests (parallel) ──┐
       → Frontend tests (parallel) ──┤
                                      ↓
                              All passed?
                             ├─ YES → Render auto-deploys (After CI checks pass) → Staging live
                             │      → e2e-tests (main only)
                             └─ NO  → ❌ No deploy, developer notified
```

| Job | Runs on | Steps |
|-----|---------|-------|
| `backend-tests` | Every push/PR | `npm ci` → `tsc --noEmit` → `npm test` |
| `frontend-tests` | Every push/PR | `npm ci` → `tsc --noEmit` → `npm test` |
| `e2e-tests` | Main push only, after tests pass | Install Playwright → run against test DB |

**Deploy Gate:** Render Auto-Deploy = **"After CI checks pass"**. Staging only deploys after all GitHub Actions checks succeed. No tests = no deploy.

**GitHub Secrets required:** `DATABASE_URL_TEST`, `JWT_SECRET_TEST`

### Deployment Environments

| Environment | Backend | Frontend | Database | Branch |
|-------------|---------|----------|----------|--------|
| Dev | localhost:5500 | localhost:5501 | Neon (dev) | local |
| Staging | Render (free) | Render (static) | Neon (staging) | main |
| Production | Render (starter) | Render (static) | Neon (production) | production |

**Config:** `render.yaml` (Render Blueprint), `.env.example` (reference)
**Rule:** NEVER run migrations directly on production — test on staging first

---

## BACKEND RULES

### Controllers — `BaseController.handle()` only

Reference: `server/src/routes/tenant/species.ts`

- NEVER `res.json()` / `res.status().json()` — BaseController wraps in ApiResponse
- NEVER read TenantContext — BaseController resolves it
- NEVER try/catch — BaseController forwards to errorHandler
- NEVER accept `tenantId` from request body on tenant routes — always JWT context
- ALWAYS validate with Zod `bodySchema` option
- ALWAYS return data — BaseController wraps it

### Services — `extends BaseService`

Reference: `server/src/services/SpeciesService.ts`

- NEVER read AsyncLocalStorage — tenantId passed as first parameter
- NEVER receive `req`/`res` — services don't know HTTP
- ALWAYS use: `findMany`, `findById`, `insertOne`, `updateById`, `softDelete`
- ALWAYS soft delete (`isActive = false`) — hard delete forbidden
- ALWAYS `this.exists()` before insert (uniqueness check)
- `findMany()` auto-filters `is_active = true` — opt out explicitly only when needed
- Business logic ONLY in services — controllers delegate

### Errors — Throw typed, never `res.status()`

| Class | Code | When |
|-------|------|------|
| `ValidationError(msg, details?, messageKey?, params?)` | 400 | Bad input |
| `UnauthorizedError(msg?)` | 401 | No/invalid token |
| `ForbiddenError(msg?, messageKey?, params?)` | 403 | No permission |
| `TenantSuspendedError(tenantId)` | 403 | Suspended tenant |
| `NotFoundError(entity, id?)` | 404 | Record missing (auto-populates messageKey) |
| `ConflictError(msg, messageKey?, params?)` | 409 | Duplicate/conflict |
| `QuotaExceededError(resource, limit)` | 429 | Quota hit |
| `RateLimitedError(retryAfter?)` | 429 | Rate exceeded |
| `ServiceUnavailableError(service)` | 503 | External down |

**Production:** NEVER expose stack traces. 500 errors return: `"An unexpected error occurred."`

### Bilingual Error Messages — Code + Params Pattern

Backend sends `messageKey` + `params` alongside English `message`. Frontend translates via i18n. Adding a new language = translation file only (zero backend changes).

| Rule | Standard |
|------|----------|
| **Pattern** | `throw new ConflictError(msg, 'ENTITY_CODE_EXISTS', { entity, code })` |
| **Backend** | English `message` (fallback) + `messageKey` (i18n code) + `params` (interpolation data) |
| **Frontend** | `extractApiError()` → `i18n.t(errors.api.${messageKey}, params)` → localized display |
| **Fallback chain** | (1) `i18n.t(messageKey, params)` → (2) `i18n.t(code)` → (3) `data.error` → (4) `UNKNOWN` |
| **Adding language** | Create translation file + register in i18n config. Zero backend changes |
| **New error** | Add to `MessageErrorCode` type → add i18n key EN+AR → use in service throw |
| **Entity names** | Backend sends English name in `params.entity`, frontend translates via `entities.*` i18n |
| **NotFoundError** | Auto-populates `messageKey` + `params` from constructor args — free i18n for all throws |
| **Backward compat** | `messageKey` is optional — existing throws without it continue to work |

**API error response with bilingual data:**
```json
{
  "success": false,
  "error": "Posting period \"March 2026\" is CLOSED",
  "code": "VALIDATION_ERROR",
  "messageKey": "POSTING_PERIOD_CLOSED",
  "params": { "name": "March 2026", "status": "CLOSED" }
}
```

**MessageErrorCode type** (`server/src/core/errors/AppError.ts`): 37 specific codes covering Entity CRUD, Chart of Accounts, Journal Entries, Posting Periods, Warehouse, Tax, and Roles.

### API Response Format — NEVER Deviate

```json
{ "success": true, "data": { ... } }
{ "success": true, "data": { "data": [...], "pagination": { "page", "limit", "total", "totalPages", "hasNext", "hasPrev" } } }
{ "success": false, "error": "...", "code": "NOT_FOUND" }
```

### API Design

- RESTful verbs on plural nouns: `GET /patients`, `POST /patients`, `PUT /patients/:id`
- Pagination: `?page=1&limit=20` — default 20, min 1, max 100 (hard cap, unbypassable)
- Search: `?search=` — always supported on list endpoints
- Tenant routes: `/api/v1/tenant/{resource}` | System routes: `/api/v1/system/{resource}`
- Max nesting 2 levels: `/patients/:id/records` OK, deeper BAD
- Page beyond totalPages → empty array, not error

### Validation — Zod in `server/src/validations/`

Reference: `speciesValidation.ts`

- `createSchema` → POST body | `updateSchema` → PUT body (`.partial()`) | `listSchema` → GET query
- ALWAYS human-readable messages: `z.string().min(1, 'First name is required')` — never raw Zod defaults
- Server validation is SINGLE SOURCE OF TRUTH — client validates for UX only

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public (`/auth/*`) | 100 req | 1 hour |
| Authenticated | 1000 req | 1 hour |
| Export/Bulk | 10 req | 1 hour |
| Per Tenant (all users combined) | 5000 req | 1 hour |

Status 429 with `Retry-After` header. Include `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.

### Auto Code Generation — Entity Codes

When an entity needs auto-generated codes (Item: ITM-00001, Invoice: INV-000001):

| Rule | Pattern |
|------|---------|
| **Generation** | `SELECT MAX(code) WHERE tenant_id=? AND code LIKE 'PREFIX-%'`, extract number, increment, pad |
| **Concurrency** | Wrap in transaction + rely on UNIQUE index — DB constraint error → retry |
| **Prefix** | Per entity: ITM (items), INV (invoices), PO (purchase orders) |
| **Padding** | 5 digits minimum (00001), grows naturally beyond 99999 |
| **Frontend** | Code field HIDDEN on create form, shown as READ-ONLY on edit form and list table |
| **Immutability** | Code cannot be changed after creation |

### Middleware Chain

```
authMiddleware → autoPanelGuard() → tenantLoader → tenantStatusGuard → panelGuard → rateLimiter → routes
```

### DPF Screen Definitions — Single Source of Truth

| Rule | Standard |
|------|----------|
| **Definition** | Screens ONLY in `server/src/rbac/dpfStructure.ts` — synced to DB on startup |
| **Frontend** | ALWAYS fetch dynamically via `useDPFModuleTree()` hook from `client/src/hooks/useDPFModules.ts` |
| **NEVER** | Hardcode screen lists in frontend files — no manual module/screen arrays |
| **Cache** | staleTime 24hr (config data), backend 10min TTL |
| **Tenant API** | `GET /api/v1/tenant/dpf/modules/tree` — single JOIN, cached response |
| **System API** | `GET /api/v1/system/dpf/modules/tree` — same handler, system tenant context |
| **New screen** | Add to `dpfStructure.ts` → restart server → auto-synced + auto-granted to built-in roles |
| **Hook usage** | `useDPFModuleTree('tenant')` for app/admin, `useDPFModuleTree('system')` for system panel |
| **Isolation** | Tenant API → `isSystemModule = false` only. System API → `isSystemModule = true` only |
| **Only built screens** | `dpfStructure.ts` contains ONLY developed screens. Add new screens when feature is built |
| **Auto-grant** | New screens in `dpfStructure.ts` auto-get Full (level 2) authorization for all built-in roles on server restart |
| **TENANT_ADMIN** | Protected role, auto-assigned to tenant creator, full permissions on all tenant screens — never manually edited |

### Document Immutability — SYSTEM-WIDE RULE

Every financial/transactional document in the system is IMMUTABLE after creation.
This applies to: Journal Entries, Sales Invoices, Purchase Orders, Payments, Credit Notes,
Delivery Notes, Goods Receipt POs — ALL documents.

| Rule | Standard |
|------|----------|
| **Save = POSTED** | No DRAFT status. Clicking Save = document is final and POSTED |
| **No edits** | Once saved, NO field can be modified. Document is locked. |
| **No deletion** | Documents are NEVER deleted (soft or hard). They exist forever. |
| **Corrections** | Mistakes corrected ONLY through Reverse Transactions |
| **Reversal** | Creates a NEW document with mirrored/negated values, links to original |
| **Status flow** | `POSTED → REVERSED` (only 2 states, no DRAFT) |
| **Audit trail** | Original + reversal both preserved permanently |

This matches SAP B1 and enterprise accounting standards.
Services must enforce: once a document row has status=POSTED, UPDATE is forbidden
(except setting status to REVERSED and linking to the reversal document).

### withRetry() — Database Resilience Utility

Reference: `server/src/core/retry.ts`

| Rule | Standard |
|------|----------|
| **When** | Operations that can fail due to transient DB errors (deadlocks, serialization, Neon cold starts) |
| **Pattern** | `withRetry(async () => { ... }, { maxRetries: 3, label: 'operationName' })` |
| **Default policy** | Handles ECONNRESET, deadlocks (40P01), serialization failures (40001) |
| **Used in** | `DocumentNumberSeriesService.getNextNumber()`, `TenantCodeGenerator` |

### Services — Advanced BaseService Methods

Beyond basic CRUD (`findMany`, `findById`, `insertOne`, `updateById`, `softDelete`):

| Method | Purpose |
|--------|---------|
| `this.transaction(async (tx) => { ... })` | Atomic multi-table mutations |
| `this.findByIdOrNull(tenantId, table, id)` | Returns null instead of throwing NotFoundError |
| `this.count(tenantId, table, filters?)` | Count records with automatic tenant isolation |
| `this.db` (protected) | Direct Drizzle access for complex queries (JOINs, subqueries, aggregations) |
| `this.auditableInsertOne(tenantId, table, data, resourceType)` | Insert + fire-and-forget audit log |
| `this.auditableUpdateById(tenantId, table, id, data, resourceType, entityName)` | Update + audit log with old/new diff |
| `this.auditableSoftDelete(tenantId, table, id, resourceType, entityName)` | Soft delete + audit log |

### Master/Detail Pattern (Header + Lines)

Reference: `server/src/db/schemas/postingPeriods.ts` + `PostingPeriodService.ts`

For entities with parent-child structure (Fiscal Year + Sub-Periods, Journal Entry + Lines):

| Rule | Pattern |
|------|---------|
| **Schema** | Two tables in same file: `{entity}` (header) + `{entity}Lines` or `{entity}SubItems` |
| **Service** | Single service handles both tables. CRUD on header, separate methods for children. |
| **Create** | ALWAYS transactional: insert header → insert children in same `db.transaction()` |
| **Route nesting** | `GET /:id/lines` for child list. Max 2 levels. |
| **Cascade delete** | Child FK `onDelete: 'cascade'` — deleting header removes children |
| **Indexes** | Child table: index on parent FK column + unique constraint on (parent_id, sequence_number) |

---

## DATABASE RULES

### Schema Pattern

Reference: `server/src/db/schemas/species.ts`. Every domain table MUST have:

| Column | Type | Rule |
|--------|------|------|
| `id` | uuid | primaryKey, defaultRandom |
| `tenant_id` | uuid FK | ALWAYS (except `tenants`, `subscriptionFeatures`) |
| `code` | varchar(50) | unique per tenant |
| `name` + `name_ar` | varchar | bilingual |
| `is_active` | boolean | default true (soft delete flag) |
| `created_at` | timestamp | defaultNow |
| `updated_at` | timestamp | defaultNow, onUpdate |

- FK `onDelete`: always specify `cascade` or `set null`
- Table names: `snake_case` plural | Column names: `snake_case`

### Relations — `server/src/db/schemas/relations.ts`

- ALL relations centralized in `relations.ts` — NEVER inline in schema files
- Parent → `many()` | Child → `one()`
- New schema → add to `relations.ts` + `schemas/index.ts`

### Indexes — Mandatory

```typescript
// EVERY domain table:
// 1. Composite (tenant_id, is_active)   — most common query filter
// 2. Composite (tenant_id, code)        — uniqueness lookups
// 3. Individual index on every FK column
```

### Migrations

- ALWAYS: `npx drizzle-kit generate` → review SQL → `npx drizzle-kit push`
- NEVER `DROP TABLE` or remove columns — deprecate with comments
- ALWAYS test migration on dev before staging/production

### Query Performance Budgets

| Operation | Target | Hard Limit |
|-----------|--------|------------|
| GET single record | <10ms | 50ms |
| GET paginated list | <50ms | 200ms |
| POST/PUT/DELETE | <50ms | 200ms |
| Bulk operations | <2s | 5s |

- Log queries >50ms as warnings, >200ms as errors
- `LIMIT` on every query — hard cap 100
- `count(*)` for totals — never fetch all to count
- No N+1 queries — use JOINs or batch
- Batch inserts/updates in transactions, max 1000 per batch

---

## FRONTEND RULES

### API Calls

- ALWAYS `apiClient` from `@/lib/api` — handles auth, base URL, interceptors
- NEVER raw `axios` (exception: `axios.isAxiosError()` for type check)
- NEVER hardcode API URLs or set Authorization headers manually

### React Query Hooks

Reference: `client/src/hooks/useSpecies.ts`

- One hook file per entity: `use{Entity}.ts`
- Query key factory: `all`, `lists`, `list(filters)`, `details`, `detail(id)`
- Cache invalidation on mutations:

| Mutation | Invalidate |
|----------|------------|
| Create | `entityKeys.lists()` |
| Update | `entityKeys.lists()` + `entityKeys.detail(id)` |
| Delete | `entityKeys.lists()` |

- `staleTime`: 30s lists, 5min detail, 24hr config
- NEVER `useState` + `useEffect` + `fetch` — React Query only
- System-only hooks (`/system/*`) MUST accept `enabled` param guarded by `user.accessScope === 'system'`

### UI Components — REUSE FIRST

Before creating anything, check `client/src/components/ui/`:

| Component | Use For |
|-----------|---------|
| `DataTable` / `AdvancedDataTable/` | All data tables |
| `Pagination` | Table pagination |
| `SearchField` | Search inputs |
| `FilterGroup` | Filter dropdowns |
| `PageHeader` | Page titles with actions |
| `Breadcrumbs` | Navigation breadcrumbs |
| `Drawer` | Side panels (create/edit) |
| `Skeleton` | Loading states |
| `badge` | Status badges |
| `select` / `select-advanced` | Dropdowns |
| `switch` | Toggles |
| `radio-group` | Radio buttons |
| `accordion` | Collapsible sections |
| `Icon` | All icons (Lucide) |
| `ThemeToggle` | Dark/light mode |
| `FormWizard/` | Multi-step wizard forms |
| `PhoneInput` | Phone number with country dial code |
| `ImageUpload` | Image upload with drag-drop + preview |
| `HeaderToolbar` | Header quick actions dropdown (branch switch, history, JE preview) |
| `VirtualizedTable` | Large scrollable tables (react-window) |
| `empty-state` / `error-state` / `loading-state` | Full-page state displays |

Rules: check existing → extend if close → new shared in `ui/` → domain-specific in `components/{domain}/`

### UI Pattern Decision

| Pattern | When | Fields | URL? | Lazy? |
|---------|------|--------|------|-------|
| **Page** | Complex forms (5+ fields), multi-step, will grow | Unlimited | Yes `/create` | Yes |
| **Drawer** | Medium forms (3-7), quick CRUD | ~10 | No | No |
| **Modal** | Confirmations, alerts, choices only | ~3 | No | No |

**Modal is NEVER for entity creation.** If form might grow → Page from day one.

### Create/Edit Page Form Pattern

Reference: `client/src/pages/system/SystemCreateUserPage.tsx`

All Create/Edit pages MUST follow this structure:

| Element | Pattern |
|---------|---------|
| **Outer** | `<div className="space-y-4">` with Header + Card as siblings |
| **Header** | Manual `<h1>` + `StyledIcon` + `Breadcrumbs` (NOT `PageHeader`) |
| **Card** | `<div className="rounded-lg border max-w-2xl" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>` |
| **Error banner** | Inside Card top: `<div className="px-5 py-3 text-sm border-b" style={{ danger vars }}>` |
| **Fields** | `<div className="px-5 py-5 space-y-4">` |
| **Each field** | `<div className="space-y-1.5">` → Label → Input/Select → Error |
| **Label** | `<Label className="text-xs flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />Name</Label>` |
| **Input** | `className="h-9"` + `error={!!errors.field}` |
| **Error msg** | `<p className="text-xs" style={{ color: 'var(--color-text-danger)' }}>` |
| **Footer** | `<div className="px-5 py-3 flex items-center justify-end gap-3 border-t">` Cancel (ghost) then Save (primary) |

NEVER:
- Use `PageHeader` for create/edit forms — use manual header
- Use `mt-1.5` between Label and Input — use `space-y-1.5` wrapper
- Put buttons on the left — always `justify-end`
- Use hardcoded colors (`text-red-500`) — use CSS variables
- Put Save before Cancel — Cancel is first (left), Save is second (right)

### Multi-Card Form Pattern (5+ fields, multiple sections)

Reference: `client/src/pages/inventory/CreateItemPage.tsx`

When a form has multiple logical sections (e.g., General + Image + UoM + Pricing):

| Element | Pattern |
|---------|---------|
| **Outer** | `<div className="space-y-4">` with Header + Cards |
| **Header** | Same as single-card pattern (manual h1 + StyledIcon + Breadcrumbs) |
| **Max width** | `max-w-4xl` (wider than single-card's `max-w-2xl`) |
| **Side-by-side** | `<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">` |
| **Each card** | Same `rounded-lg border` styling as single-card |
| **Card header** | `<div className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium">` |
| **Card body** | `<div className="px-5 py-5 space-y-4">` |
| **Footer** | Single footer below ALL cards: Cancel (ghost) + Save (primary) |
| **Error banner** | Above all cards (not inside any card) |

Conditional sections: `{condition && <Card>...</Card>}` — never CSS display:none.
When hiding a section, clear its field values in state (don't submit hidden values).

### AccountSelector in Forms

`AccountSelector` renders its own label + trigger + error. When placing it in a form Card,
use it directly inside the grid — it handles its own spacing. Its label (`text-xs`), height (`h-9`),
and error styling (CSS variables) match the form field pattern automatically.

### List Page — Table Cell Styling Standards

Reference: `client/src/components/ui/AdvancedDataTable/AdvancedDataTable.tsx` (line 325)

AdvancedDataTable cell default: `text-sm text-[var(--color-text)]` — pages MUST NOT override font-weight.

| Cell Type | Styling | Example |
|-----------|---------|---------|
| **Primary data** | No extra classes (inherit component default) | Name, Email |
| **Code/identifier** | `font-mono` only — no `font-medium` | Tenant code, Tax code |
| **Secondary data** | `style={{ color: 'var(--color-text-secondary)' }}` | Phone, Description |
| **Muted data** | `style={{ color: 'var(--color-text-muted)' }}` | Dates, Empty values |
| **Numeric** | `font-mono` | Rate, Amount |
| **Status badge** | `<Badge>` with themed background/border | Active/Inactive |
| **Type badge** | `<Badge>` with themed background/border | Tax Type, Role Type |

NEVER:
- Add `font-medium`, `font-semibold`, or `font-bold` to data cells
- Add `backgroundColor` to plain data cells (only Badge components)
- Wrap data in `<code>` tags with backgrounds — use `font-mono` class instead
- Use inconsistent row heights — standard is `rowHeight={48}`

### List Page — Toggle Active/Inactive Button

Reference: `client/src/pages/users/UsersListPage.tsx`

All list pages with active/inactive toggle MUST use this exact pattern:

| Aspect | Standard |
|--------|----------|
| **Icons** | `Ban` (when active → will deactivate) / `CheckCircle2` (when inactive → will activate) |
| **Base color** | `var(--color-danger)` if active (Ban), `var(--color-success)` if inactive (CheckCircle2) — colored at REST |
| **Hover BG** | `var(--color-surface-hover)` |
| **Hover color** | Same as base color (no color change on hover) |
| **Loading** | `Loader2` spinner during mutation |
| **Disabled** | `disabled={isToggling}` + `disabled:opacity-50` |

NEVER:
- Use `Power` icon for toggle — use `Ban`/`CheckCircle2`
- Use `var(--color-text-muted)` as base color for toggle icons — they MUST be colored at rest
- Skip loading spinner during mutation
- Use custom color logic different from Users page pattern

### Dropdown Data Loading Pattern

When loading entity options for a dropdown (e.g., Item Groups in Item form):

| Rule | Pattern |
|------|---------|
| **Hook** | `useEntityList({ isActive: 'true', limit: 100 })` — reuse list hook with active filter |
| **staleTime** | 5min for dropdown/config data (not 30s like lists) |
| **Mapping** | `useMemo` to map to `{ value: id, label: code + ' - ' + name }` |
| **RTL** | `isRTL && item.nameAr ? item.nameAr : item.name` |
| **Nullable FK** | Prepend `{ value: '', label: t('common.none') }` for optional fields |
| **Loading** | Show "Loading..." as single disabled option while fetching |

### Error Handling

Flow: Backend → `errorHandler` → JSON → Axios → `extractApiError()` → banner OR toast (never both)

```typescript
import { extractApiError } from '@/lib/apiError';
import { useToast } from '@/components/ui/toast';

// In handleSubmit catch:
const apiError = extractApiError(err);
if (Object.keys(apiError.fieldErrors).length > 0) setErrors(apiError.fieldErrors);
setSubmitError(apiError.message);
// NO showToast('error') here — banner is sufficient for form errors
```

- ALWAYS `extractApiError()` — NEVER parse `err.response.data` manually
- ALWAYS `useToast()` from `@/components/ui/toast` — NEVER `@/hooks/use-toast`
- Toast types: `'success'`, `'error'`, `'warning'`, `'info'`

### Error Display Pattern — Banner vs Toast

| Scenario | Banner (`setSubmitError`) | Toast (`showToast`) |
|----------|--------------------------|---------------------|
| Form submit error | YES | NO — redundant |
| Non-form action error (toggle, delete, reversal) | NO | YES |
| Success notification | NO | YES |

**NEVER show both banner AND toast for the same error.**

### `extractApiError` Priority

Backend `data.error` ALWAYS takes priority over code-mapped generic messages.
i18n code mappings (`errors.api.*`) are FALLBACK only when backend sends no message.
This ensures specific backend messages (e.g., "Posting period March 2026 is CLOSED") are shown to the user, not generic text.

### Component Rules

- Page = layout + data fetching only — no business logic
- Max 200 lines per component — split if larger
- Loading → Skeleton (never blank screen) | Error → always handled (never silent)
- Forms → Zod validation matching server schemas

### Performance

- Lazy load all routes: `React.lazy()`
- Virtualize lists >50 items: `react-window`
- `useMemo` for expensive computations, `useCallback` for prop functions
- Debounce search 300ms
- Target: initial load <3s, page transitions <500ms, list renders <100ms

---

## IMPORT CONVENTIONS

### Order (enforce in all files)

```typescript
// 1. Node/External packages
import { Router } from 'express';
import { z } from 'zod';

// 2. Internal core/shared
import { BaseService } from '@/core/service/BaseService';
import { NotFoundError } from '@/core/errors/AppError';

// 3. Database/schemas
import { db } from '@/db';
import { species } from '@/db/schemas';

// 4. Local/relative (max 1 level deep)
import { formatDate } from '../utils';
```

### Rules

- ALWAYS use `@/` path alias — NEVER `../../` deeper than 1 level
- NEVER circular imports: if A imports B, B must NOT import A
- NEVER `import type` mixed with value imports — separate lines

---

## TYPE SAFETY

- NEVER `any` — includes `Record<string, any>`, `as any`, function params
- Use `unknown` + type narrowing for truly unknown data
- Server services export types: `export type Species = typeof species.$inferSelect`
- Shared types in `/types` folder for cross-boundary usage
- All API responses fully typed — no `data: any` in hooks
- Zod `z.infer<typeof schema>` for input types — single source of truth

---

## DATE & TIME STANDARDS

| Rule | Standard |
|------|----------|
| Storage | Always UTC in database (`timestamp` columns) |
| API transport | ISO 8601 strings: `2025-01-15T09:30:00.000Z` |
| Client display | Convert to user's timezone on render only |
| Comparisons | Always compare UTC — never local time |
| Library | `date-fns` for manipulation (tree-shakeable) |
| Temporal validation | `endDate > startDate` enforced in Zod schemas |
| Financial dates | Fiscal period validation — cannot post to CLOSED period |
| Appointments | Store in UTC, display in branch timezone |

- NEVER `new Date().toLocaleString()` for storage or API responses
- NEVER compare dates without normalizing to UTC first

---

## LOGGING & OBSERVABILITY

### Log Levels

| Level | When | Example |
|-------|------|---------|
| `error` | Failures requiring attention | Unhandled exceptions, DB connection lost, payment failed |
| `warn` | Degradation / fallback | Redis offline (using L1 cache), rate limit approaching |
| `info` | Key business events | User login, tenant created, role assigned, job completed |
| `debug` | Development only | Query params, cache hits, request payloads |

### What to Log

- Auth failures (with IP, user agent — never password)
- Permission denials (userId, resource, required level)
- Slow queries >50ms (query, duration, tenant)
- Job start/complete/failure (jobId, type, duration)
- External API calls (service, endpoint, status, duration)
- Graceful shutdown events

### What NEVER to Log

- Passwords, tokens, API keys
- Full request/response bodies in production
- PII (patient names, client phone numbers) — use IDs only
- Credit card numbers, medical record content

### Structured Format

```typescript
logger.info('Tenant created', { tenantId, code, plan, duration: `${ms}ms` });
logger.error('Payment failed', { tenantId, invoiceId, error: err.message, stack: err.stack });
```

Always include `tenantId` and `traceId` in log context for cross-request correlation.

---

## ENVIRONMENT VALIDATION

**File:** `server/src/config/env.ts` — imported as first line of `server/src/index.ts`. Fail fast if invalid.

```typescript
import { env } from './config/env';  // Validated, typed config object
```

Key vars: `DATABASE_URL` (required), `SESSION_SECRET` or `JWT_SECRET` (≥16 chars), `REDIS_URL` (optional), `SERVER_PORT` (default 5500), `CLIENT_URL` (default http://localhost:5501)

JWT_SECRET resolution: explicit `JWT_SECRET` → `SESSION_SECRET` fallback → dev-only default

- NEVER access `process.env` directly after startup — use `env` object from `config/env.ts`
- NEVER commit `.env` files — maintain `.env.example` with all keys (no values)
- Sensitive vars (JWT_SECRET, DB passwords) must be 16+ characters in production

---

## TESTING STRATEGY

### Test Counts (current)

| Layer | Tests | Files | Runner |
|-------|-------|-------|--------|
| Backend Services | ~220 | 18 | Vitest + mock DB |
| Backend Routes | ~186 | 17 | Vitest + Supertest |
| Backend Core | ~115 | 4 | Vitest |
| Frontend Hooks | 72 | 12 | Vitest + MSW |
| Frontend Components | 62 | 10 | Vitest + Testing Library |
| Frontend Lib | 16 | 1 | Vitest |
| Frontend Setup | 4 | 2 | Vitest |
| E2E | 25 | 7 | Playwright + Chromium |
| **Total** | **~700** | **71** | |

### Structure

```
server/src/**/*.test.ts    ← Co-located with source (521 tests, 39 files)
client/src/**/*.test.tsx   ← Co-located with source (154 tests, 25 files)
e2e/**/*.spec.ts           ← E2E tests (25 tests, 7 files)
```

### Running Tests

```bash
cd server && npm test              # 521 backend tests
cd client && npm test              # 154 frontend tests (may need batches on Windows)
npm run test:e2e                   # 25 E2E tests (needs running server+client+test DB)
```

### Test Runner & Config

**Backend:**
- **Runner:** Vitest v4 (`server/vitest.config.ts`)
- **Integration:** Supertest with `server/src/test/createTestApp.ts` (injects TenantContext via AsyncLocalStorage)
- **Helpers:** `server/src/test/helpers.ts` (deterministic UUIDs, factory functions)
- **Coverage:** `cd server && npx vitest run --coverage` (v8 provider)
- **Template:** `server/src/services/SpeciesService.test.ts` (service), `server/src/routes/tenant/species.test.ts` (route)

**Frontend:**
- **Runner:** Vitest v4 (`client/vitest.config.ts`) with jsdom
- **Mocking:** MSW v2 (`client/src/test/mocks/handlers.ts` + `server.ts`)
- **Wrapper:** `client/src/test/renderWithProviders.tsx` (QueryClient + MemoryRouter)
- **Config:** `pool: 'forks'`, `fileParallelism: false`, `maxConcurrency: 3` (OOM prevention)
- **Template:** `client/src/hooks/useSpecies.test.ts` (hook), `client/src/components/ui/DataTable.test.tsx` (component)

**E2E:**
- **Runner:** Playwright (`playwright.config.ts`)
- **Auth:** `e2e/global-setup.ts` saves 3 storageState files (system/admin/app)
- **WebServer:** Auto-starts server (5500) + client (5501)
- **Env:** `.env.test` with `DATABASE_URL_TEST` for isolated Neon test DB

### Backend Tests

| Layer | Tool | What to Test |
|-------|------|-------------|
| Services | Vitest + mock DB | Business logic, validation, edge cases |
| Routes | Vitest + Supertest | HTTP status, response shape, auth guard |
| Multi-tenant | Supertest | Tenant A cannot see Tenant B data |

### Frontend Tests

| Layer | Tool | What to Test |
|-------|------|-------------|
| Hooks | Vitest + MSW | API calls, cache invalidation, error states |
| Components | Vitest + Testing Library | Renders, user interactions, form validation |

### E2E Tests

| Suite | Tests | What |
|-------|-------|------|
| `auth-flow.spec.ts` | 5 | Login, logout, invalid credentials, panel guards |
| `tenant-crud.spec.ts` | 4 | System admin: list, create, edit, suspend tenant |
| `patient-workflow.spec.ts` | 5 | Create client → patient → list → edit → delete |
| `journal-entry.spec.ts` | 4 | Balanced entry, reject unbalanced, reverse, REVERSED status |
| `multi-tenant-isolation.spec.ts` | 3 | Cross-tenant blocked, URL manipulation blocked, system sees all |

### Critical Test Cases (every entity)

1. CRUD operations succeed with valid data
2. Validation rejects invalid input with correct field errors
3. Tenant isolation — cross-tenant access returns 403/empty
4. Auth guard — unauthenticated requests return 401
5. Soft delete — record becomes invisible but exists in DB
6. Pagination — respects page/limit, returns correct metadata

### Test-First Rule for New Features

When building a new entity/feature, tests are MANDATORY — not optional:

```
Backend:  {Entity}Service.test.ts (8-12 tests) + {entity}.test.ts route (11 tests)
Frontend: use{Entity}.test.ts (6 tests)
```

Copy from Species template, adapt assertions. Run `npm test` before committing.

### MSW Handler Pattern (Frontend)

When adding a new entity hook test, add default MSW handlers in `client/src/test/mocks/handlers.ts`:

```typescript
// Required per entity: GET list, GET detail, POST create, PUT update, DELETE
http.get(`${API}/tenant/{entity}`, () => HttpResponse.json(paginated([]))),
http.post(`${API}/tenant/{entity}`, async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json(single({ id: 'new-1', ...body }), { status: 201 });
}),
```

Response format: `single(data)` = `{ success: true, data }`, `paginated(items)` = `{ success: true, data: { data: [...], pagination: {...} } }`

---

## REALTIME / WEBSOCKET STANDARDS

### Event Naming

Format: `entity:action` — lowercase, colon-separated

```
patient:created    tenant:suspended    appointment:cancelled
role:updated       notification:new    job:completed
```

### Rules

- ALL events include `tenantId` — Socket.IO middleware validates tenant membership
- Validate incoming events with Zod schemas (same as REST validation)
- Max message payload: 100KB
- Client reconnection: exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Clean up connections on auth failure — disconnect with reason code
- Use Redis adapter for horizontal scaling across server instances

---

## BACKGROUND JOBS

Reference: `server/src/jobs/jobQueue.ts`

### When to Use Jobs

- Operations >500ms (email, PDF generation, bulk import)
- External API calls that can fail (payment, SMS, webhook)
- Batch operations on >100 records

### Priority Levels

| Priority | Use Case | Timeout |
|----------|----------|---------|
| `critical` | Auth seed, permission sync | 60s |
| `high` | Role change propagation, cache warmup | 30s |
| `normal` | Notifications, email, reports | 30s |
| `low` | Cleanup, analytics aggregation | 120s |

### Rules

- Retry: 3 attempts, exponential backoff (1s → 2s → 4s)
- Always include `tenantId` in job data for isolation
- Log job start/complete/failure with duration
- Jobs >30s should be broken into smaller sub-jobs
- Dead letter queue for jobs that exhaust all retries
- NEVER run destructive operations (delete, suspend) in background jobs without audit log

---

## AUDIT TRAIL

Reference: `server/src/db/schemas/auditLogs.ts`

### Mandatory Audit Events

| Severity | Actions |
|----------|---------|
| `critical` | User delete, role permission change, tenant suspend, financial reversal |
| `high` | Create/update user, role assignment, tenant config change |
| `medium` | Entity CRUD (patients, clients, appointments) |
| `low` | List views on sensitive data (medical records, financial reports) |

### Rules

- Log `oldData` + `newData` + `diff` for all updates
- Include `userId`, `tenantId`, `traceId`, `ipAddress`
- Audit logs are APPEND-ONLY — never update, never delete
- Retention: 7 years minimum (medical + financial regulatory requirement)
- Access: read-only to authorized compliance roles

---

## CONCURRENCY CONTROL

### Optimistic Locking (for entities with concurrent edits)

Add `version` column (integer, default 1) to tables where concurrent edits are expected:
- Roles, Users, Tenant Settings, Financial Records

```typescript
// Update pattern:
// 1. Read record with current version
// 2. UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?
// 3. If 0 rows affected → throw ConflictError('Record was modified by another user')
```

### Pessimistic Locking (for atomic number generation)

Reference: `server/src/services/DocumentNumberSeriesService.ts`

For operations where two users MUST NOT get the same value (document numbers, codes):

| Rule | Pattern |
|------|---------|
| **Lock** | `SELECT ... FOR UPDATE` inside `db.transaction()` |
| **Retry** | Wrap in `withRetry()` for deadlock resilience |
| **Scope** | Lock the narrowest possible row (single series, not whole table) |
| **Duration** | Keep transaction short (<100ms) — read, increment, commit |

Never use pessimistic locking for general CRUD — only for sequential number generation.

### Transactions

- Financial operations: ALWAYS wrap in `db.transaction()`
- Multi-table mutations: ALWAYS transactional
- Read-only queries: no transaction needed
- Transaction timeout: 5s max — fail fast, don't hold locks

---

## MULTI-TENANT ISOLATION — NEVER BREAK

1. Every DB query has `WHERE tenant_id = ?` — BaseService enforces automatically
2. NEVER expose `tenant_id` in URLs — comes from JWT context
3. Tenant routes NEVER accept `tenantId` from request body — always context
4. System users specify tenant via `?tenantId=xxx` query param only
5. Suspended tenants blocked by `tenantStatusGuard`
6. Check tenant quotas before create operations
7. Cache keys MUST be prefixed with `tenant:{id}:` — never shared across tenants
8. Background jobs MUST include `tenantId` — never process without tenant context
9. WebSocket rooms scoped to `tenant:{id}` — never broadcast cross-tenant
10. Log entries MUST include `tenantId` for filtering and compliance

---

## SECURITY

- No endpoint without `authMiddleware` (except `/auth/*`, `/health`)
- No secrets in code — `.env` only, validated at startup
- Zod validation on every input (body, query, params)
- Soft delete only — audit trail preserved
- bcryptjs 12 rounds | JWT access 15min, refresh 7d
- NEVER expose stack traces in production
- NEVER log passwords, tokens, PII
- CORS: explicit origin whitelist, never `*` in production
- Content-Security-Policy headers on all responses
- SQL injection prevention: Drizzle ORM parameterized queries only — NEVER raw SQL with string interpolation
- XSS prevention: React auto-escapes — NEVER `dangerouslySetInnerHTML` with user input

---

## FILE UPLOAD STANDARDS

### Backend — Multer Middleware

Reference: `server/src/middleware/uploadMiddleware.ts`

| Rule | Standard |
|------|----------|
| Library | `multer` with disk storage |
| Destination | `server/public/uploads/{entityType}/` |
| Filename | `{tenantId}_{uuidv4()}_{timestamp}.{ext}` — tenant-scoped, unique |
| Max size | 5MB per file (configurable per entity) |
| MIME whitelist | Validate BOTH file extension AND MIME type |
| Image types | `image/jpeg`, `image/png`, `image/webp` |
| Storage column | `imageUrl varchar(500)` — stores relative path: `/uploads/items/{filename}` |
| Static serving | `app.use('/uploads', express.static('public/uploads'))` |
| Cleanup | On image remove: delete file from disk + set column to null |
| Security | NEVER trust client filename — always rename. NEVER serve from within `src/` |

### Frontend — ImageUpload Component

Reference: `client/src/components/ui/ImageUpload.tsx`

Reusable component: drag-and-drop + click-to-browse, preview with remove button.
Props: `value` (URL), `onUpload` (File → Promise<URL>), `onRemove`, `maxSizeMB`, `accept`, `disabled`.

---

## ACCESSIBILITY (WCAG 2.1 AA)

- All form inputs MUST have associated `<label>` elements
- All buttons MUST have descriptive text or `aria-label`
- Keyboard navigation: Tab, Enter, Escape must work on all interactive elements
- Color alone MUST NOT convey information — always pair with icon or text
- Focus indicators must be visible on all focusable elements
- DataTable rows must be navigable via keyboard
- RTL layout must work correctly for Arabic language

---

## FINANCIAL INFRASTRUCTURE

### Chart of Accounts
- Tree structure: `parentId` self-referencing FK
- `isPostable`: true = accepts journal entries, false = group only
- Default template seeded per tenant on creation

### Document Number Series
- Per tenant, per branch, per document type — **mandatory**, auto-seeded on branch creation
- 7 types: PURCHASE_ORDER, GOODS_RECEIPT_PO, SALES_INVOICE, CREDIT_NOTE, DELIVERY_NOTE, PAYMENT_RECEIPT, JOURNAL_ENTRY
- Number format: **numbers only** by default (e.g., `10000001`) — prefix optional (admin can add later)
- Branch-scoped ranges: Branch 1 = 10000001+, Branch 2 = 20000001+, Branch 3 = 30000001+
- Concurrent-safe: `SELECT ... FOR UPDATE` inside transaction + `withRetry()` for deadlock resilience
- Admin UI: view/edit only (no manual creation) — Administration > Setup > Document Number Series
- Optimistic locking (`version` column) for admin edits
- Reference: `server/src/services/DocumentNumberSeriesService.ts`

### Posting Periods
- Per tenant fiscal year + 12 monthly sub-periods (master/detail)
- Sub-period status: OPEN → CLOSED → LOCKED
- OPEN = posting allowed, CLOSED = no new posting, LOCKED = immutable
- Auto-seeded on tenant creation (current year)
- Reference: `server/src/services/PostingPeriodService.ts`

### Journal Entries
- Double-entry bookkeeping: header + lines (master/detail pattern)
- Golden rule: `SUM(debit) = SUM(credit)` — enforced in service before save
- Save = POSTED (immutable, no DRAFT) — follows Document Immutability Rule
- Status: POSTED → REVERSED (only 2 states)
- Linked to source: `sourceType` + `sourceId` (MANUAL, SALES_INVOICE, PURCHASE_ORDER, etc.)
- Posting period validation: date must fall in OPEN sub-period
- Account validation: all accounts must be `isPostable = true`
- Document number: auto-generated via DocumentNumberSeriesService (JOURNAL_ENTRY type)
- Reversal: creates new POSTED entry with swapped debits/credits, marks original REVERSED
- GL posting: atomic balance update via GLPostingService inside same transaction
- `createFromDocument(tx, tenantId, userId, input)`: extensibility for future documents (GRPO, Invoice)
- Reference: `server/src/services/JournalEntryService.ts`

### Account Balances (GL Engine)
- Materialized balance per (tenant × account × sub-period × branch) — SAP B1 pattern
- UPSERT on JE create: `INSERT ... ON CONFLICT DO UPDATE` — row-level lock, zero contention across accounts
- Fields: openingDebit/Credit, periodDebit/Credit, closingDebit/Credit (= opening + period), transactionCount, version
- ~1800 rows/tenant/year → instant Trial Balance queries (<10ms)
- GLPostingService called inside JE transaction — if posting fails, JE rolls back
- Reversal: swapped amounts naturally negate — no special undo logic needed
- Reference: `server/src/services/GLPostingService.ts`, `server/src/db/schemas/accountBalances.ts`

### GL Reports
- Trial Balance: aggregates from account_balances GROUP BY account — period range + branch filter
- Account Ledger: detail from journal_entry_lines JOIN journal_entries — running balance server-side, paginated
- DPF screens: TRIAL_BALANCE, ACCOUNT_LEDGER (Finance module, auto-granted on restart)
- Reference: `server/src/services/GLReportService.ts`

### Financial Document UI Pattern (SAP B1 Style)

All 7 financial document types (Journal Entry, Sales Invoice, Purchase Order, Credit Note, Delivery Note, Goods Receipt PO, Payment Receipt) share the same UI pattern:

| Rule | Standard |
|------|----------|
| **Create + Detail = same layout** | Detail page mirrors Create page with all fields `disabled`. No separate "view" design. |
| **Save = POSTED** | No DRAFT. Clicking Save/Add = document is final. |
| **Detail = read-only** | All `<Input disabled>`, `<AccountSelector disabled>`. No edit capability. |
| **Code field** | Hidden on Create (auto-generated), visible on Detail (read-only, `font-mono`). |
| **Status badges** | `DocumentStatusBadge` in Detail header. Source type `Badge` next to it. |
| **Corrections** | Only via Reverse button in Detail footer (creates new document with negated values). |
| **Template pages** | `CreateJournalEntryPage.tsx` (Create) + `JournalEntryDetailPage.tsx` (Detail) — copy for new types. |

**Shared behavioral components** (reused across all 7 document types):

| Component | Path | Purpose |
|-----------|------|---------|
| `DocumentStatusBadge` | `client/src/components/document/DocumentStatusBadge.tsx` | POSTED/REVERSED badge with bilingual labels |
| `DocumentReversalBanner` | `client/src/components/document/DocumentReversalBanner.tsx` | Info/warning banners linking to original/reversal document |
| `ReverseDocumentDialog` | `client/src/components/document/ReverseDocumentDialog.tsx` | Reversal confirmation dialog (date + remarks) |
| `DocumentHistoryDrawer` | `client/src/components/document/DocumentHistoryDrawer.tsx` | Timeline drawer showing document lifecycle (create/reverse/update) |
| `useDocumentReversal` | `client/src/hooks/useDocumentReversal.ts` | Dialog state + `canReverse` logic |

**Pattern rule:** Extract shared **behaviors** (reversal, status). Keep domain-specific **layout** at page level. Each document type has different fields and line columns — no visual wrapper abstraction.

**New document type checklist (frontend):**
1. Copy `CreateJournalEntryPage.tsx` → adapt fields and line columns
2. Copy `JournalEntryDetailPage.tsx` → adapt fields and line columns (all disabled)
3. Import `DocumentStatusBadge`, `DocumentReversalBanner`, `ReverseDocumentDialog`, `DocumentHistoryDrawer` from `@/components/document`
4. Import `useDocumentReversal` from `@/hooks/useDocumentReversal`

---

## FEATURE BUILD CHECKLIST

Create files IN ORDER:

### Backend (4 files → wire 3 files → migrate)

```
1. server/src/db/schemas/{entity}.ts               ← copy species.ts
2. server/src/validations/{entity}Validation.ts     ← copy speciesValidation.ts
3. server/src/services/{Entity}Service.ts           ← copy SpeciesService.ts
4. server/src/routes/tenant/{entity}.ts             ← copy species.ts route
   4b. If entity used in dropdowns → use list with { isActive: 'true', limit: 100 } (no /active endpoint)
5. server/src/db/schemas/index.ts                   ← export * from './{entity}'
6. server/src/db/schemas/relations.ts               ← add relations
7. server/src/routes/tenant/index.ts                ← router.use('/{entity}', router)
   7b. If entity needs default seed → add to TenantSetupService
   7c. If entity has concurrent edits → add `version` column (optimistic locking)
8. npx drizzle-kit generate && npx drizzle-kit push
```

### Tests (MANDATORY — create WITH the feature, not after)

```
9.  server/src/services/{Entity}Service.test.ts     ← copy SpeciesService.test.ts (8-12 tests)
10. server/src/routes/tenant/{entity}.test.ts       ← copy species.test.ts (11 tests)
11. Run: cd server && npm test                      ← MUST pass before frontend
```

### Frontend (3-5 files + 1 test)

```
12. client/src/hooks/use{Entity}.ts                 ← copy useSpecies.ts
13. client/src/hooks/use{Entity}.test.ts            ← copy useSpecies.test.ts (6 tests)
14. client/src/test/mocks/handlers.ts               ← add MSW handlers for new entity
15. client/src/pages/{domain}/{Entity}ListPage.tsx
16. client/src/components/{domain}/{Entity}Form.tsx  ← or CreatePage for 5+ fields
17. client/src/routes/AppRouter.tsx                  ← add route (lazy + Suspense)
18. client/src/layouts/UnifiedTenantLayout.tsx       ← add to sidebar if new module
19. client/src/i18n/locales/{en,ar}/translation.json ← add i18n keys
20. Run: cd client && npm test                      ← MUST pass before committing
```

---

## NAMING CONVENTIONS

| Item | Convention | Example |
|------|-----------|---------|
| Schema file | camelCase | `patients.ts`, `journalEntries.ts` |
| Schema const | camelCase plural | `export const patients` |
| DB table | snake_case plural | `patients`, `journal_entries` |
| DB column | snake_case | `tenant_id`, `is_active` |
| Service class | PascalCase + Service | `PatientService` |
| Validation file | camelCase + Validation | `patientValidation.ts` |
| Route file | camelCase | `patients.ts` |
| Hook file | use + PascalCase | `usePatients.ts` |
| Page component | PascalCase + Page | `PatientsListPage.tsx` |
| API path | kebab-case plural | `/api/v1/tenant/patients` |
| Types | PascalCase | `Patient`, `CreatePatientInput` |
| Socket events | entity:action | `patient:created` |
| Cache keys | tenant:{id}:{entity} | `tenant:abc:species:list` |
| Job types | SCREAMING_SNAKE | `BULK_USER_IMPORT` |

---

## FILE STRUCTURE

```
server/src/
  core/
    controller/BaseController.ts    ← Auto tenant context + validation + error handling
    service/BaseService.ts          ← Auto tenant isolation + CRUD helpers
    errors/AppError.ts              ← Error class hierarchy
    response/ApiResponse.ts         ← Unified response format
    tenant/tenantContext.ts         ← AsyncLocalStorage tenant context
  config/
    env.ts                          ← Zod-validated environment config (imported first)
    logger.ts                       ← Winston/Pino logger instance
  db/schemas/                       ← All Drizzle schemas + relations.ts + index.ts
  db/migrations/                    ← Drizzle migrations (never delete)
  services/                         ← Business logic (extends BaseService)
  validations/                      ← Zod validation schemas
  routes/tenant/                    ← Tenant-scoped routes (index.ts mounts all)
  routes/system/                    ← System admin routes
  jobs/                             ← Background job definitions
  realtime/                         ← Socket.IO event handlers
  middleware/                       ← Auth, tenant, error, rate limit
  api/routes/index.ts               ← Main router (middleware chain)

client/src/
  hooks/                            ← React Query hooks (one per entity)
  hooks/*.test.ts                   ← Hook tests (MSW + renderHook)
  pages/{domain}/                   ← Page components
  components/ui/                    ← Shared UI (DataTable, Drawer, Skeleton, etc.)
  components/ui/*.test.tsx          ← Component tests (Testing Library)
  components/{domain}/              ← Domain-specific components
  components/document/              ← Shared financial document components (reversal, status)
  lib/api.ts                        ← apiClient (axios + interceptors)
  lib/apiError.ts                   ← extractApiError()
  contexts/                         ← Auth, Permission contexts
  routes/AppRouter.tsx              ← Route definitions
  test/setup.ts                     ← Vitest setup (MSW lifecycle)
  test/renderWithProviders.tsx      ← Test wrapper (QueryClient + Router)
  test/mocks/handlers.ts            ← MSW handlers for all entities
  test/mocks/server.ts              ← MSW server instance

e2e/                                ← Playwright E2E tests
  global-setup.ts                   ← Auth 3 users, save storageState
  auth-flow.spec.ts                 ← Login/logout/guards
  tenant-crud.spec.ts               ← System admin CRUD
  patient-workflow.spec.ts          ← Client → Patient flow
  journal-entry.spec.ts             ← Financial workflow
  multi-tenant-isolation.spec.ts    ← Tenant isolation
  .auth/                            ← storageState (gitignored)

.github/workflows/test.yml         ← CI/CD: backend + frontend + E2E
playwright.config.ts                ← Playwright config
render.yaml                         ← Render deployment blueprint
types/                              ← Shared types (client + server)
```

---

## QUICK REFERENCE

| Need | Location |
|------|----------|
| Tenant isolation | `server/src/core/service/BaseService.ts` |
| Error handling | `server/src/core/controller/BaseController.ts` |
| Response format | `server/src/core/response/ApiResponse.ts` |
| Error classes | `server/src/core/errors/AppError.ts` |
| Data tables | `client/src/components/ui/DataTable.tsx` |
| Side panels | `client/src/components/ui/Drawer.tsx` |
| Search inputs | `client/src/components/ui/SearchField.tsx` |
| Page headers | `client/src/components/ui/PageHeader.tsx` |
| Loading states | `client/src/components/ui/Skeleton.tsx` |
| Status badges | `client/src/components/ui/badge.tsx` |
| Dropdowns | `client/src/components/ui/select*.tsx` |
| Pagination | `client/src/components/ui/Pagination.tsx` |
| Filters | `client/src/components/ui/FilterGroup.tsx` |
| Breadcrumbs | `client/src/components/ui/Breadcrumbs.tsx` |
| SAP B1 Auth Grid | `client/src/components/roles/ScreenAuthorizationGrid.tsx` |
| DPF Module Tree hook | `client/src/hooks/useDPFModules.ts` |
| DPF Screen definitions | `server/src/rbac/dpfStructure.ts` |
| API error extraction | `client/src/lib/apiError.ts` |
| Toast notifications | `client/src/components/ui/toast.tsx` |
| Env config | `server/src/config/env.ts` |
| Logger | `server/src/config/logger.ts` |
| Feature template | Species (Schema + Validation + Service + Route + Hook) |
| withRetry utility | `server/src/core/retry.ts` |
| Document numbering | `server/src/services/DocumentNumberSeriesService.ts` |
| Posting periods | `server/src/services/PostingPeriodService.ts` |
| Journal entries | `server/src/services/JournalEntryService.ts` |
| GL posting engine | `server/src/services/GLPostingService.ts` |
| GL reports (TB + Ledger) | `server/src/services/GLReportService.ts` |
| Account balances schema | `server/src/db/schemas/accountBalances.ts` |
| GL report hooks | `client/src/hooks/useGLReports.ts` |
| Trial Balance page | `client/src/pages/finance/TrialBalancePage.tsx` |
| Account Ledger page | `client/src/pages/finance/AccountLedgerPage.tsx` |
| Document status badge | `client/src/components/document/DocumentStatusBadge.tsx` |
| Reversal dialog | `client/src/components/document/ReverseDocumentDialog.tsx` |
| Reversal banners | `client/src/components/document/DocumentReversalBanner.tsx` |
| Document history drawer | `client/src/components/document/DocumentHistoryDrawer.tsx` |
| Document reversal hook | `client/src/hooks/useDocumentReversal.ts` |
| Header Toolbar | `client/src/components/ui/HeaderToolbar.tsx` |
| Audit trail API route | `server/src/routes/tenant/auditTrail.ts` |
| Audit trail hook | `client/src/hooks/useAuditTrail.ts` |
| Page resource context | `client/src/contexts/PageResourceContext.tsx` |
| Document Create template | `client/src/pages/finance/CreateJournalEntryPage.tsx` |
| Document Detail template | `client/src/pages/finance/JournalEntryDetailPage.tsx` |
| Service test template | `server/src/services/SpeciesService.test.ts` |
| Route test template | `server/src/routes/tenant/species.test.ts` |
| Hook test template | `client/src/hooks/useSpecies.test.ts` |
| MSW handlers | `client/src/test/mocks/handlers.ts` |
| Test wrapper | `client/src/test/renderWithProviders.tsx` |
| Test helpers | `server/src/test/helpers.ts` |
| CI/CD workflow | `.github/workflows/test.yml` |
| Render blueprint | `render.yaml` |
| Playwright config | `playwright.config.ts` |
| E2E auth setup | `e2e/global-setup.ts` |

---

## ENTERPRISE CONTINUOUS DEVELOPMENT STANDARDS

### Zero-Regression Policy

Every commit MUST maintain the following invariants:

| Check | Command | Threshold |
|-------|---------|-----------|
| Backend tests | `cd server && npm test` | 0 failures |
| Frontend tests | `cd client && npm test` | 0 failures |
| Backend TypeScript | `cd server && npx tsc --noEmit` | 0 errors in production code |
| Frontend TypeScript | `cd client && npx tsc --noEmit` | 0 errors |
| CI pipeline | GitHub Actions | All jobs green |

**Rule:** If tests break, fix them BEFORE adding new code. Never disable or skip failing tests.

### Code Quality Gates

| Gate | Standard | Enforcement |
|------|----------|-------------|
| **Type safety** | Zero `any` in production code | tsc --noEmit in CI |
| **Test coverage** | New service: min 8 tests. New route: min 11 tests. New hook: min 6 tests | Review checklist |
| **API contract** | Every endpoint returns `{ success, data }` or `{ success, error, code }` | Route tests validate shape |
| **Tenant isolation** | Every service test includes multi-tenant case | Service test template |
| **Soft delete** | Every entity test verifies `isActive=false` on delete | Service test template |
| **Input validation** | Zod schema on every endpoint, tested with invalid data | Route tests |
| **Error classes** | Only typed AppError subclasses — never raw `throw new Error()` | Code review |

### Scalability Architecture Rules

| Dimension | Standard | Limit |
|-----------|----------|-------|
| **DB queries per request** | Minimize — use JOINs, never N+1 | Max 5 queries |
| **Transaction duration** | Keep short for lock contention | Max 5s |
| **Pagination** | Enforced on all list endpoints | Max 100 per page (hard cap) |
| **Cache TTL** | Tiered: L1 5min, L2 (Redis) 15min | Config data: 24hr |
| **API response size** | Paginated, no unbounded arrays | Max 100 items per response |
| **Background job timeout** | Short tasks, decompose large ones | Max 120s per job |
| **File upload** | Validated MIME + size | Max 5MB per file |
| **WebSocket payload** | Keep small, frequent updates | Max 100KB per message |

### Database Evolution Rules

| Rule | Standard |
|------|----------|
| **Migrations** | Generate → review SQL → push. NEVER auto-push without review |
| **No destructive changes** | NEVER `DROP TABLE`, `DROP COLUMN` — deprecate with comments |
| **Backward compatible** | New columns MUST have defaults. Old clients must still work |
| **Index strategy** | Every domain table: `(tenant_id, is_active)` + `(tenant_id, code)` + FK indexes |
| **Seed data** | Changes to seed data go through `TenantSetupService` — auto-sync on restart |
| **Schema naming** | New table → add to `schemas/index.ts` + `relations.ts` immediately |

### API Versioning & Backward Compatibility

| Rule | Standard |
|------|----------|
| **Base path** | `/api/v1/` — all current endpoints |
| **Breaking changes** | NEVER change response shape on existing endpoints |
| **Deprecation** | Log warning for 2 releases before removal |
| **New fields** | Add as optional — never required on existing endpoints |
| **New endpoints** | Add freely — no version bump needed |
| **Version bump** | Only when response shape MUST change (rare) — `/api/v2/` |

### Monitoring & Alerting Standards

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response time P95 | >500ms | Investigate slow queries |
| API response time P99 | >2s | Immediate fix required |
| Error rate (5xx) | >1% | Alert + investigate |
| DB connection pool | >80% utilized | Scale or optimize |
| Redis memory | >80% | Review cache TTLs |
| Disk usage (uploads) | >80% | Archive old files |
| Failed background jobs | >5% retry exhaustion | Review dead letter queue |

### Release Process

```
1. Developer creates feature/* branch
2. Write code + tests (following Feature Build Checklist)
3. Run locally: server tests + client tests + TypeScript checks
4. Push → CI runs automatically (backend + frontend in parallel)
5. PR review → merge to main
6. Auto-deploy to Staging (Render watches main)
7. Manual QA on Staging
8. Promote to Production (Render promote or merge to production branch)
9. Verify production health (error rate, response times)
```

### Incident Response

| Severity | Example | Response Time | Action |
|----------|---------|---------------|--------|
| **P0 Critical** | All tenants down, data breach | <15min | Rollback immediately, notify all |
| **P1 High** | Single tenant down, auth broken | <1hr | Fix or rollback, notify affected |
| **P2 Medium** | Feature broken, slow performance | <4hr | Fix in next deploy |
| **P3 Low** | UI glitch, non-critical bug | Next sprint | Track in backlog |

**Rollback:** `git revert` + push to main → auto-redeploy. NEVER fix forward under P0/P1.

### Performance Budgets (enforced)

| Metric | Target | Hard Limit | Measured By |
|--------|--------|------------|-------------|
| Initial page load | <2s | 3s | Lighthouse CI |
| Page transition | <300ms | 500ms | React profiler |
| API GET single | <10ms | 50ms | Server logs |
| API GET list | <50ms | 200ms | Server logs |
| API POST/PUT | <50ms | 200ms | Server logs |
| JS bundle (gzipped) | <300KB | 500KB | Build output |
| Largest Contentful Paint | <2.5s | 4s | Lighthouse |
| Time to Interactive | <3.5s | 5s | Lighthouse |

### Multi-Environment Data Management

| Environment | Data | Reset Frequency | Access |
|-------------|------|-----------------|--------|
| **Dev (local)** | Full seed data, test credentials | On demand | Developer only |
| **Test (CI)** | Minimal seed, disposable | Every CI run | Automated |
| **Staging** | Production-like seed, test tenants | Weekly | Team + QA |
| **Production** | Real data, no test accounts | Never reset | Restricted |

**Rule:** NEVER copy production data to lower environments without anonymization.

### Documentation Requirements

| Change | Required Documentation |
|--------|----------------------|
| New entity/feature | Update CLAUDE.md "Built & Working" section |
| New API endpoint | Postman collection update |
| New DPF screen | Added to `dpfStructure.ts` (auto-documented) |
| Breaking change | Migration guide in PR description |
| New environment variable | Update `.env.example` |
| Architecture decision | Comment in relevant code section |

### Technical Debt Management

| Priority | When to Fix | Example |
|----------|-------------|---------|
| **Fix now** | Blocks feature development | Broken test, type error |
| **Fix this sprint** | Degraded developer experience | Slow tests, unclear error |
| **Fix next sprint** | Code smell, not user-facing | Console.log cleanup, naming |
| **Track in backlog** | Nice-to-have improvement | Legacy controller migration |

**Rule:** When touching a file with known debt, fix the debt in that file. Don't leave it worse.
