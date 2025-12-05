# Veterinary ERP SaaS Platform

## Overview
This project is an enterprise-grade, multi-tenant Veterinary ERP SaaS platform aimed at providing a robust foundation for veterinary practice management. The initial phase focuses on establishing a production-ready infrastructure with 100% AGI-Grade Tenant Isolation to ensure high security, performance, and scalability. The platform is designed to streamline veterinary clinic operations with advanced features and a modern technology stack, with future plans for comprehensive ERP functionalities, advanced clinical tools, and AI/AGI integration to achieve significant market potential and business growth.

## User Preferences
I prefer detailed explanations and a clear understanding of the architectural decisions. I want iterative development with a focus on core functionalities first. Ask before making major changes to the system architecture or core dependencies.

## System Architecture

### Monorepo Structure
The project uses a monorepo, separating the frontend (`/client`), backend (`/server`), shared TypeScript types (`/types`), and development/deployment scripts (`/scripts`).

### Technology Stack
-   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI, Zustand, React Query, React Router v6, i18next (Arabic RTL + English), Socket.IO Client.
-   **Backend:** Node.js 20, Express.js, TypeScript, Drizzle ORM (PostgreSQL), Socket.IO Server with Redis Adapter, Redis, Zod, Winston, Prometheus, Helmet, CORS, Rate Limiting, node-cron.

### Master Brand Guidelines
The platform adopts a "Modern Medical Blue" design system with a specific color palette, typography (Inter for English, Cairo for Arabic), and standardized border radii.

### Platform Core Layer (Enterprise Foundation)
The platform features an enterprise-grade core layer, including:
-   **Request Context Layer:** `AsyncLocalStorage`-based request tracing, distributed tracing, client metadata capture, and context propagation.
-   **Context Logger:** Winston integration with automatic trace context, tenant, and user information injection.
-   **Health Check System:** Kubernetes-compatible `/health`, `/health/ready`, `/health/live` probes with dependency checks.
-   **Audit Logging System:** Immutable compliance trail with async writes, JSONB diff tracking, and severity levels.
-   **API Versioning:** Path-based versioning (`/api/v1/*`) with `Accept-Version` header support.
-   **Rate Limiting Service:** Multi-tier (IP, user, tenant) sliding window algorithm with Redis.
-   **Tiered Caching:** L1 in-memory and L2 Redis caching with namespace isolation and invalidation groups.
-   **Quota System:** Multi-tenant resource limits supporting various plan tiers.
-   **Event Bus Interface:** Foundation for async processing and event-driven architecture.

### Enterprise Infrastructure & Security
-   **Tenant Isolation:** Achieved via `AsyncLocalStorage` for request-scoped context, Socket.IO JWT authentication, and database-level filtering.
-   **Caching:** Redis integration with graceful degradation.
-   **Job Scheduling:** For routine maintenance tasks.
-   **Logging & Monitoring:** Winston for structured logs and Prometheus for metrics.
-   **Security:** Helmet, CORS, Rate Limiting, and Token Rotation.
-   **DPF-AGI (Dynamic Permission Fabric with AGI Integration):** A robust, high-performance permission system with auto-registration, caching, tenant isolation, and AGI Interpreter for natural language to permission operations (English & Arabic). Includes production-ready RBAC UI modules for permission matrix management and user role assignment with real-time updates, AGI natural language interpretation, and role impact preview.

### Database Schema
Enhanced tables (`tenants`, `business_lines`, `branches`, `users`) and new tables (`branch_capacity`, `modules`, `screens`, `actions`, `permissions`, `roles`, `role_permissions`, `user_roles`, `agi_logs`, `voice_logs`) support multi-tenancy, access control, and DPF-AGI.

### Performance & Scalability
Optimized with 32 database indexes, Redis adapter for Socket.IO horizontal scaling, graceful Redis degradation, Neon Pooler for connection pooling, and comprehensive observability (Winston, Prometheus).

### Multi-Panel Frontend Architecture
Features a scope-based multi-panel design:
-   **System Admin Panel (`/system/*`):** Dark theme using CSS tokens (--sys-bg: #0D0D0D, --sys-surface: #1A1A1A, --sys-accent: #8B5CF6), for `accessScope: 'system'`.
-   **Tenant Admin Panel (`/admin/*`):** Light blue theme, for `accessScope: 'tenant'`.
-   **User App Panel (`/app/*`):** Teal/green theme, for `accessScope: 'branch' | 'business_line' | 'mixed'`.
Includes `ScopeRedirect` and `ProtectedRoute` for dynamic routing and access control based on user scope.

### System Panel CSS Token System (Dec 2024)
Unified dark theme using CSS custom properties:
-   `--sys-bg`: #0D0D0D (main background)
-   `--sys-surface`: #1A1A1A (card/panel backgrounds)
-   `--sys-surface-hover`: #252525 (hover states)
-   `--sys-border`: #2A2A2A (borders)
-   `--sys-text`: #F5F5F5 (primary text)
-   `--sys-text-secondary`: #A3A3A3 (secondary text)
-   `--sys-text-muted`: #737373 (muted text)
-   `--sys-accent`: #8B5CF6 (purple accent color)
-   `--sys-button`: #262626 (button backgrounds)
-   `--sys-error`: #EF4444 (error states)

### System Panel User Management (Dec 2024)
-   **SystemUsersListPage:** Dark-themed platform users list with UserTypeSelector modal for creating System Users or Tenant Admins
-   **SystemCreateUserPage:** Dark-themed user creation form supporting two user types via URL query parameter (?type=system or ?type=tenant_admin)
-   **SystemTenantsListPage:** Dark-themed tenants management page
-   **SystemUserService:** Backend service for creating system users and tenant admins with correct scope/tenant assignments
-   **Built-in Roles:** SYSTEM_ADMIN (platform-wide, accessScope: 'system', tenantId: null) and TENANT_ADMIN (tenant-scoped, accessScope: 'tenant', tenantId: specific) with auto-grant permissions, marked as isProtected and isDefault
-   **Permission Auto-Grant:** PermissionContext grants wildcard ['*'] permissions for system and tenant_admin users
-   **Demo Credentials:** superadmin@system.local / Admin@123 (Tenant Code: SYSTEM)

## External Dependencies

-   **Database:** Neon Serverless PostgreSQL
-   **Real-time Communication:** Socket.IO
-   **Caching/Pub-Sub:** Redis
-   **UI Components:** Shadcn UI
-   **Internationalization:** i18next
-   **Monitoring:** Prometheus