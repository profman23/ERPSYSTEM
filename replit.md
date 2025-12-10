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

## External Dependencies

-   **Database:** Neon Serverless PostgreSQL
-   **Real-time Communication:** Socket.IO
-   **Caching/Pub-Sub:** Redis
-   **UI Components:** Shadcn UI
-   **Internationalization:** i18next
-   **Monitoring:** Prometheus