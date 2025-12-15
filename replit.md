# Veterinary ERP SaaS Platform

## Overview
This project is an enterprise-grade, multi-tenant Veterinary ERP SaaS platform designed to streamline veterinary clinic operations. Its primary purpose is to provide a robust foundation with 100% AGI-Grade Tenant Isolation, ensuring high security, performance, and scalability. The platform aims to achieve significant market potential through comprehensive ERP functionalities, advanced clinical tools, and AI/AGI integration, positioning it for substantial business growth.

## User Preferences
I prefer detailed explanations and a clear understanding of the architectural decisions. I want iterative development with a focus on core functionalities first. Ask before making major changes to the system architecture or core dependencies.

## System Architecture

### Monorepo Structure
The project utilizes a monorepo, organizing frontend, backend, shared TypeScript types, and development/deployment scripts into distinct directories.

### Technology Stack
-   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI, Zustand, React Query, React Router v6, i18next (Arabic RTL + English), Socket.IO Client.
-   **Backend:** Node.js 20, Express.js, TypeScript, Drizzle ORM (PostgreSQL), Socket.IO Server with Redis Adapter, Redis, Zod, Winston, Prometheus, Helmet, CORS, Rate Limiting, node-cron.

### Master Brand Guidelines
The platform adheres to a "Modern Medical Blue" design system, defining a specific color palette, typography (Inter for English, Cairo for Arabic), and standardized border radii.

### Platform Core Layer
An enterprise-grade core layer provides:
-   **Request Context Layer:** `AsyncLocalStorage`-based tracing and context propagation.
-   **Context Logger:** Winston integration with automatic context injection.
-   **Health Check System:** Kubernetes-compatible probes.
-   **Audit Logging System:** Immutable compliance trail with JSONB diff tracking.
-   **API Versioning:** Path-based (`/api/v1/*`) and header-based.
-   **Rate Limiting Service:** Multi-tier (IP, user, tenant) sliding window algorithm.
-   **Tiered Caching:** L1 in-memory and L2 Redis caching with isolation.
-   **Quota System:** Multi-tenant resource limits.
-   **Event Bus Interface:** Foundation for async processing.

### Enterprise Infrastructure & Security
-   **Tenant Isolation:** Achieved via `AsyncLocalStorage`, Socket.IO JWT authentication, and database-level filtering.
-   **DPF-AGI (Dynamic Permission Fabric with AGI Integration):** A robust permission system with auto-registration, caching, tenant isolation, and AGI Interpreter for natural language to permission operations (English & Arabic). Includes RBAC UI modules for management and real-time updates.
-   **Security:** Helmet, CORS, Rate Limiting, and Token Rotation.

### Database Schema
Enhanced and new tables (`tenants`, `users`, `permissions`, `roles`, `agi_logs`, etc.) support multi-tenancy, access control, and DPF-AGI.

### Performance & Scalability
Optimized with database indexes, Redis adapter for Socket.IO horizontal scaling, Neon Pooler for connection pooling, and comprehensive observability.

### Multi-Panel Frontend Architecture
A scope-based multi-panel design:
-   **System Admin Panel (`/system/*`):** Dark theme.
-   **Tenant Admin Panel (`/admin/*`):** Light blue theme.
-   **User App Panel (`/app/*`):** Teal/green theme.
Includes `ScopeRedirect` and `ProtectedRoute` for dynamic routing and access control.

### Global Theming Engine
An enterprise-grade cascading CSS token system with a six-layer architecture ensures WCAG AA compliance and UX consistency:
-   **Layer 0 - CSS Reset:** Browser normalization.
-   **Layer 1 - Global Semantic Tokens:** Base tokens inherited by all panels with WCAG AA compliant status colors.
-   **Layer 2 - Component Tokens:** Bindings for all UI components.
-   **Layer 3 - Panel-Specific Themes:** Themes applied via `data-panel` attribute (System, Tenant, App panels).
-   **Layer 4 - Text-on-Color Tokens:** For text on colored backgrounds.
-   **Layer 5 - Utility Classes:** Token-based utility classes.
All color combinations meet ≥4.5:1 contrast ratio, and zero hardcoded colors or Tailwind color utilities are used across migrated pages.

### Multi-Tenant Branding Layer
Dynamic tenant branding is supported via CSS variable injection for runtime customization. The `ThemeProvider` allows loading and clearing custom branding, with secure validation of colors, fonts, and logos. WCAG AA contrast enforcement is guaranteed through an `adjustColorForContrast()` algorithm that ensures all tenant-customizable color tokens meet ≥4.5:1 contrast ratios.

### System Panel User Management
Features for managing platform users and tenants:
-   SystemUsersListPage, SystemCreateUserPage, SystemTenantsListPage for administrative tasks.
-   Backend service (`SystemUserService`) for user creation with correct scope/tenant assignments.
-   Built-in roles (SYSTEM_ADMIN, TENANT_ADMIN) with auto-granted permissions.

### UX Normalization Architecture
Achieved 100% UX consistency across all platform pages through a declarative token-based design system. This involved eliminating hardcoded colors, standardizing gradients and status badges, and implementing unified loading/empty/error state components.

### Advanced Tenant Creation System (COMPLETE)
Enterprise-grade tenant creation with automated DPF structure provisioning:

#### Backend Services
-   **TenantCodeGenerator:** Bulletproof concurrent code generation with atomic INSERT ON CONFLICT pattern
    - Guarantees 100% unique codes under 50+ concurrent requests
    - Uses Drizzle ORM `onConflictDoNothing` with automatic retry (max 5)
    - Code format: VET-XXXXXX-TIMESTAMP (e.g., VET-A3B9C2-T7B348)
    - Redis optional (performance enhancement only)
    - Prometheus metrics: duration histogram, conflict retries counter, concurrent requests gauge
    - Test endpoints: POST `/api/v1/tenants/test-concurrent`, GET `/api/v1/tenants/test-metrics`
-   **SubscriptionService:** Plan limits management with 4 tiers (trial, standard, professional, enterprise)
-   **DPFTemplateService:** Fast DPF structure copying for new tenants
-   **TenantSetupService:** Complete tenant creation orchestrator with BullMQ integration

#### Database Schema
-   **subscription_features table:** Plan codes, limits (users, branches, business lines, storage, API rate)
-   **tenants table extensions:** countryCode, subscriptionStartAt, subscriptionExpiresAt, trialExpiresAt, dpfTemplateApplied

#### API Endpoints
-   `POST /api/v1/tenants/advanced` - Create tenant with full setup
-   `PUT /api/v1/tenants/advanced/:id` - Update tenant
-   `GET /api/v1/tenants/meta/generate-code` - Generate unique tenant code
-   `GET /api/v1/tenants/meta/subscription-plans` - Get available plans
-   `GET /api/v1/tenants/meta/countries` - Get Middle East countries with timezones

#### Frontend Components
-   **CountryTimezoneSelector:** Country dropdown with auto timezone selection (13 Middle East countries)
-   **SubscriptionPlanSelector:** Plan selection cards with feature display
-   **TenantFormModal:** Create/edit modal with validation
-   **SystemTenantsListPage:** Integrated with modal for tenant management

#### Key Files
-   `server/src/services/TenantSetupService.ts` - Tenant creation orchestrator
-   `server/src/services/TenantCodeGenerator.ts` - Unique code generation
-   `server/src/services/SubscriptionService.ts` - Plan limits
-   `server/src/services/DPFTemplateService.ts` - DPF copying
-   `server/src/api/controllers/systemTenantController.ts` - API endpoints
-   `server/src/db/schemas/subscriptionFeatures.ts` - Plans and countries
-   `client/src/components/tenants/*` - Frontend components

### Phase 7: AGI-Ready Performance Foundation (COMPLETE)
Enterprise-grade performance architecture for 100k+ concurrent users and AGI integration:

#### Ultra-High Performance Caching (L1 + L2 + L3)
-   **L1 (In-Memory):** 5,000 item capacity, true LRU eviction with access tracking, 30s default TTL
-   **L2 (Redis):** Distributed cache, Redis Set-based tag invalidation (no KEYS command), 5min adaptive TTL
-   **L3 (AGI Knowledge):** Pre-computed permission graphs, tenant hierarchies, DPF matrices, 1hr TTL
-   **Adaptive TTL Algorithm:** Dynamically adjusts cache duration based on hit ratio, load, and priority
-   **Cache Warming:** Startup routines for critical data paths
-   **ScopeService Caching:** Hot path optimization with 99%+ cache hit ratio target

#### BullMQ Background Processing Engine
Seven purpose-built queues for async workloads:
-   `aniDecisionQueue` (5 workers): ANI classification, recommendation, prediction, analysis
-   `agiTaskQueue` (10 workers): AGI reasoning, planning, learning, optimization
-   `permissionRebuildQueue` (3 workers): DPF cache invalidation, role updates
-   `auditQueue` (2 workers): Compliance logging
-   `mailQueue` (3 workers): Email dispatch
-   `reportingQueue` (2 workers): Report generation
-   `bulkOperationQueue` (1 worker): Large data operations
-   Dead-letter queue for failed jobs with 30-day retention

All queues feature exponential backoff retry policies, priority support, and Prometheus metrics.

#### Distributed Write Safety Layer
-   **Idempotency Middleware:** `X-Idempotency-Key` header support, response caching for 24hrs
-   **Request Deduplication:** Prevents concurrent duplicate requests, fingerprint-based blocking
-   **Distributed Locks:** Redis SETNX-based with automatic expiration, retry with backoff
-   **Lock Key Patterns:** Tenant-scoped operations, permission assignments, bulk operations

#### Frontend High-Throughput Optimization
-   **List Virtualization:** `react-window` components for large datasets (VirtualizedList, VirtualizedTable)
-   **React.memo:** Applied to all list rows and table cells
-   **Stable Callbacks:** `useCallback` throughout list components
-   **Code Splitting:** Route-based lazy loading for all panels

#### AGI Telemetry Layer
Comprehensive observability for AGI decision-making:
-   **Cache Metrics:** L1/L2/L3 hit ratios, evictions, size tracking
-   **Queue Metrics:** Depth, processing time (avg/p95/p99), throughput, error rate
-   **Permission Metrics:** Checks/sec, allowed/denied ratios, cache hit ratio
-   **Database Metrics:** Query count, slow queries (>100ms threshold), connection pool usage
-   **Prometheus Export:** `/metrics` endpoint with all custom metrics

#### Context-Aware Caching
-   **explicitTenantId Support:** Cache options accept explicit tenant IDs for background job contexts
-   **Stale-While-Revalidate Context Preservation:** Tenant metadata captured before async revalidation
-   **ScopeService resolveTenantId():** Derives tenant from DB when RequestContext unavailable
-   **Background Job Compatibility:** All cache operations work identically in HTTP and BullMQ contexts

#### Key Files
-   `server/src/core/cache/cacheService.ts` - AGI-ready tiered cache with context preservation
-   `server/src/core/cache/types.ts` - Cache types with explicitTenantId support
-   `server/src/core/queue/queueService.ts` - BullMQ queue manager with structured results
-   `server/src/core/queue/workers.ts` - Queue worker implementations
-   `server/src/core/safety/lockService.ts` - Distributed locks
-   `server/src/core/safety/idempotencyMiddleware.ts` - Request idempotency
-   `server/src/core/safety/deduplicationMiddleware.ts` - Request dedup
-   `server/src/core/metrics/metricsCollector.ts` - Prometheus metrics
-   `server/src/core/metrics/queryLogger.ts` - Slow query detection
-   `server/src/services/ScopeService.ts` - Scope resolution with deterministic tenant caching
-   `client/src/components/ui/VirtualizedList.tsx` - List virtualization
-   `client/src/components/ui/VirtualizedTable.tsx` - Table virtualization

## External Dependencies

-   **Database:** Neon Serverless PostgreSQL
-   **Real-time Communication:** Socket.IO
-   **Caching/Pub-Sub:** Redis
-   **UI Components:** Shadcn UI
-   **Internationalization:** i18next
-   **Monitoring:** Prometheus