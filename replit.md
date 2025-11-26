# Veterinary ERP SaaS Platform

## Overview
This project is an enterprise-grade, multi-tenant Veterinary ERP SaaS platform designed to provide a robust foundation for veterinary practice management. The primary goal of Phase 1 is to establish a production-ready infrastructure with 100% AGI-Grade Tenant Isolation, ensuring high security, performance, and scalability from the outset. The platform aims to streamline operations for veterinary clinics through advanced features and a modern technology stack, with future phases expanding into comprehensive ERP functionalities, advanced clinical tools, and AI/AGI integration.

## User Preferences
I prefer detailed explanations and a clear understanding of the architectural decisions. I want iterative development with a focus on core functionalities first. Ask before making major changes to the system architecture or core dependencies.

## System Architecture

### Monorepo Structure
The project utilizes a monorepo structure, separating the frontend (`/client`), backend (`/server`), shared TypeScript types (`/types`), and development/deployment scripts (`/scripts`).

### Technology Stack
-   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI, Zustand for state management, React Query for data fetching, React Router v6 for routing, i18next for internationalization (Arabic RTL + English), Socket.IO Client for real-time communication.
-   **Backend:** Node.js 20, Express.js, TypeScript, Drizzle ORM for PostgreSQL, Socket.IO Server with Redis Adapter, Redis for caching, Zod for validation, Winston for logging, Prometheus for metrics, Helmet, CORS, Rate Limiting for security, node-cron for job scheduling.

### Master Brand Guidelines
The platform adheres to a "Modern Medical Blue" design system.
-   **Color Palette:** Primary (#2563EB), Secondary (#0EA5E9), Accent (#14B8A6), Neutral (various shades of gray), and Status colors (Success, Error, Warning, Info).
-   **Typography:** Inter for English, Cairo for Arabic, with specific weights for headings and body text.
-   **Border Radius:** Standardized values (sm: 6px, md: 10px, lg: 16px, full: 999px).

### Platform Core Layer (Enterprise Foundation)
The Platform Core Layer provides enterprise-grade infrastructure following AWS/Stripe/Uber standards:

-   **Request Context Layer (`/server/src/core/context/`):**
    -   AsyncLocalStorage-based request tracing with traceId, correlationId, requestId
    -   Distributed tracing with sampling (percentage, error, force, adaptive)
    -   Client metadata (IP, user agent, device fingerprint, forwarded-for chain)
    -   Context propagation to all async operations via `RequestContext.run()`
    -   Outbound header propagation for microservice communication

-   **Context Logger (`contextLogger`):**
    -   Winston integration with automatic trace context injection
    -   All logs include traceId, correlationId, tenantId, userId, branchId
    -   Child logger support for sub-operations

-   **Health Check System (`/health`, `/health/ready`, `/health/live`):**
    -   Kubernetes/load balancer compatible probes
    -   Dependency checks (database, Redis) with degraded/healthy status
    -   Structured JSON responses with system metadata

-   **Audit Logging System (`/server/src/core/audit/`):**
    -   Immutable compliance trail with async writes
    -   JSONB old/new/diff for change tracking
    -   Severity levels (critical, high, medium, low, info)
    -   Trace correlation for debugging

-   **API Versioning (`/api/v1/*`):**
    -   Path-based versioning with Accept-Version header support
    -   Version discovery endpoint at `/api`
    -   Deprecation tracking ready for future versions

-   **Rate Limiting Service (`/server/src/core/ratelimit/`):**
    -   Multi-tier limits (IP, user, tenant)
    -   Sliding window algorithm with Redis backend
    -   Graceful degradation to in-memory when Redis unavailable

-   **Tiered Caching (`/server/src/core/cache/`):**
    -   L1 in-memory cache (60s TTL)
    -   L2 Redis cache (5m TTL)
    -   Namespace isolation for tenant/resource separation
    -   Invalidation groups for atomic cache clearing

-   **Quota System (`/server/src/core/quota/`):**
    -   Multi-tenant resource limits (users, branches, storage, API calls)
    -   Plan tier support (basic, professional, enterprise, unlimited)
    -   Usage tracking with period-based aggregation

-   **Event Bus Interface (`/server/src/core/events/`):**
    -   Foundation for async processing and event-driven architecture
    -   Subscription management with pattern matching
    -   Error handling with dead letter queue support

### Enterprise Infrastructure & Security
-   **Tenant Isolation:** Achieved through `AsyncLocalStorage` for request-scoped tenant context, Socket.IO JWT authentication with scoped user context, packet middleware for blocking unauthorized events, strict scope validation, and database-level filtering (`and(...filters)` pattern).
-   **Caching:** Redis integration with a `CacheService` providing graceful degradation.
-   **Job Scheduling:** Implemented for routine tasks like token cleanup and DB maintenance.
-   **Logging & Monitoring:** Winston for structured logging and Prometheus for metrics.
-   **Security:** Comprehensive hardening with Helmet, CORS, Rate Limiting, and Token Rotation Security.
-   **DPF-AGI (Dynamic Permission Fabric with AGI Integration):**
    -   A robust permission system with auto-registration of modules, screens, and actions.
    -   High-performance evaluation with caching and tenant isolation.
    -   AGI Interpreter for natural language to permission operations (English & Arabic).
    -   Support for voice commands and multi-layer safety validation.
    -   Production-ready static structure defined in `dpfStructure.ts` with an idempotent sync system for database consistency.
    -   Comprehensive validation to ensure DPF integrity.
    -   **RBAC UI Modules (Production-Ready):**
        -   **Permission Matrix UI:** Hierarchical Module→Screen→Action permission assignment for roles with save/reset flows.
        -   **User Role Assignment UI:** Complete role management with real-time updates, AGI natural language interpreter ("/agi" prefix), role impact preview showing BEFORE/AFTER permission diffs, conflict detection, and Socket.IO synchronization.
        -   **React Query Integration:** Client-side caching with automatic invalidation on updates.
        -   **Backend API Integration:** All permission calculations use authenticated backend APIs, no client-side heuristics.

### Database Schema
-   **Enhanced Tables:** `tenants`, `business_lines`, `branches`, `users` are enhanced with additional fields and multi-level foreign key support to support the multi-tenant architecture and access control.
-   **New Tables:** `branch_capacity` for tracking user limits.
-   **DPF-AGI Tables:** 9 dedicated tables (`modules`, `screens`, `actions`, `permissions`, `roles`, `role_permissions`, `user_roles`, `agi_logs`, `voice_logs`) with extensive indexing for performance.

### Performance & Scalability
-   **Database Indexes:** 32 indexes across key tables (Tenants, Business Lines, Branches, Users, Roles, Permissions, Refresh Tokens) for significant query performance improvement.
-   **Scalability Features:** Redis adapter for Socket.IO horizontal scaling, graceful Redis degradation, and Neon Pooler for connection pooling.
-   **Observability:** Winston logging, Prometheus metrics, and standardized error responses.

## Recent Changes (November 2025)

-   **Multi-Tenant Hierarchy Foundation (COMPLETE - November 26, 2025):**
    -   **Enhanced Database Schema:**
        -   Tenants: subscriptionPlan, status, logoUrl, primaryColor, contactEmail, contactPhone, address, settings
        -   Business Lines: businessLineType, contactEmail, contactPhone, settings, updatedAt
        -   Branches: state, country, postalCode, phone, email, timezone, workingHours, settings, updatedAt
        -   Users: code, name, firstName, lastName, phone, avatarUrl, status, scope, allowedBranchIds, preferences
    -   **RBAC Scope System (`/server/src/services/ScopeService.ts`):**
        -   Four scope levels: tenant (full access), business_line (BL + branches), branch (single), mixed (multiple selected)
        -   Cascade permission checking with hierarchy-aware access control
        -   Dynamic scope filter generation for database queries
    -   **Hierarchy Service (`/server/src/services/HierarchyService.ts`):**
        -   Cascade tenant creation (tenant→business line→branch→user in single transaction)
        -   Automatic audit logging for all hierarchy operations
        -   Validation and transaction safety with rollback support
        -   Plan-based quota allocation (trial, standard, professional, enterprise)
    -   **Hierarchy API Endpoints (`/api/v1/hierarchy/*`):**
        -   POST /hierarchy/tenants - Create tenant with automatic quota setup
        -   POST /hierarchy/business-lines - Create business line under tenant
        -   POST /hierarchy/branches - Create branch under business line
        -   POST /hierarchy/users - Create user under branch with cascade resolution
        -   GET /hierarchy/tenants/:id/hierarchy - Full tenant structure with counts
        -   GET /hierarchy/users/:id/context - User's resolved hierarchy context
        -   GET /hierarchy/users/:id/scope - User's effective scope and filters
    -   **Demo Tenant ("Petcare Plus Veterinary"):**
        -   Code: PETCARE-001, Plan: Professional
        -   2 Business Lines: Small Animal Clinic (SAC), Equine & Large Animal (ELA)
        -   5 Branches: Main Hospital (SAC-HQ), North Clinic (SAC-N), South Clinic (SAC-S), Equine Center (ELA-EC), Mobile Unit (ELA-MU)
        -   5 Users with varied scopes: Tenant Manager, 2 Business Line Vets, 2 Branch Staff
        -   Login: Any user with password "Demo@2024!" (e.g., manager@petcareplus.vet)

-   **User Role Assignment UI Module (COMPLETE):**
    -   Created comprehensive user role management system with 7 new components/hooks
    -   RoleImpactPreview: BEFORE/AFTER permission diff viewer with conflict detection
    -   UserRoleAssignmentDrawer: Role selection with AGI natural language interpreter (English & Arabic)
    -   UserRoleAssignmentPage: Full-featured page with Socket.IO real-time synchronization
    -   useBatchRolePermissions: Authenticated batch API fetching for accurate permission calculations
    -   Routes: /users/:userId/roles for role management
    -   **Key Features:** "/agi" prefix command interpreter, Arabic language support, real-time updates, accurate permission diff calculations using backend API data

## External Dependencies

-   **Database:** Neon Serverless PostgreSQL (EU-Central-1)
-   **Real-time Communication:** Socket.IO
-   **Caching/Pub-Sub:** Redis (optional, graceful degradation in dev)
-   **UI Components:** Shadcn UI
-   **Internationalization:** i18next
-   **Monitoring:** Prometheus