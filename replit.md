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