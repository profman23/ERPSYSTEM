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

### Global Theming Engine (Dec 2024) - Phase 1 Complete
Enterprise-grade cascading CSS token system with six-layer architecture and WCAG AA compliance:

**Layer 0 - CSS Reset:**
Complete browser normalization including box-sizing, font smoothing, form resets, scrollbar styling.

**Layer 1 - Global Semantic Tokens (--color-*):**
Base tokens inherited by all panels with WCAG AA compliant status colors:
- Core: `--color-bg`, `--color-surface`, `--color-surface-hover`, `--color-border`
- Text: `--color-text`, `--color-text-secondary`, `--color-text-muted`
- Accent: `--color-accent` (#2563EB), `--color-accent-hover`, `--color-accent-light`
- Status (WCAG AA): 
  - Success: #15803D (4.7:1 with white), text: #14532D (7.2:1 on light)
  - Warning: #B45309 (4.6:1 with white), text: #78350F (7.4:1 on light)
  - Danger: #DC2626 (5.3:1 with white), text: #7F1D1D (7.8:1 on light)
  - Info: #1D4ED8 (5.9:1 with white), text: #1E3A8A (7.5:1 on light)

**Layer 2 - Component Tokens:**
Complete token bindings for all UI components:
- Button: `--btn-primary-*`, `--btn-secondary-*`, `--btn-ghost-*`, `--btn-danger-*`, `--btn-success-*`, `--btn-warning-*`, `--btn-info-*`
- Input: `--input-bg`, `--input-border`, `--input-border-focus`, `--input-error-border`
- Card: `--card-bg`, `--card-border`, `--card-shadow`
- Sidebar: `--sidebar-bg`, `--sidebar-item-bg-hover`, `--sidebar-item-bg-active`
- Table: `--table-header-bg`, `--table-row-bg`, `--table-row-bg-hover`
- Modal: `--modal-bg`, `--modal-border`, `--modal-overlay`
- Badge: `--badge-success-*`, `--badge-warning-*`, `--badge-danger-*`, `--badge-info-*`
- Alert: `--alert-success-*`, `--alert-warning-*`, `--alert-danger-*`, `--alert-info-*`

**Layer 3 - Panel-Specific Themes (via data-panel attribute):**

*System Panel* (`[data-panel="system"]`) - Dark Purple Theme:
- Background: #0D0D0D, Surface: #1A1A1A, Accent: #8B5CF6 (Purple)
- Status text (for dark surfaces): #4ADE80, #FBBF24, #F87171, #60A5FA
- Badge/Alert overrides: Opaque dark backgrounds with bright text (WCAG AA)
- Legacy aliases: `--sys-bg`, `--sys-surface`, `--sys-accent`, etc.

*Tenant Panel* (`[data-panel="tenant"]`) - Light Blue Theme:
- Background: #F8FAFC, Surface: #FFFFFF, Accent: #2563EB (Blue)
- Status text (for light surfaces): #14532D, #78350F, #7F1D1D, #1E3A8A
- Legacy aliases: `--tenant-bg`, `--tenant-surface`, `--tenant-accent`, etc.

*App Panel* (`[data-panel="app"]`) - Medical Soft Teal Theme:
- Background: #F0FDFA, Surface: #FFFFFF, Accent: #14B8A6 (Teal)
- Status text (for light surfaces): #14532D, #78350F, #7F1D1D, #1E3A8A
- Legacy aliases: `--app-bg`, `--app-surface`, `--app-accent`, etc.

**Layer 4 - Text-on-Color Tokens:**
For text displayed on colored backgrounds (buttons):
- `--color-text-on-accent`, `--color-text-on-success`, `--color-text-on-warning`
- `--color-text-on-danger`, `--color-text-on-info` (all #FFFFFF)

**Layer 5 - Utility Classes:**
Token-based utility classes for rapid development:
- Background: `.bg-surface`, `.bg-accent`, `.bg-success`, etc.
- Text: `.text-success`, `.text-warning`, `.text-danger`, `.text-info`
- Button: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-warning`, `.btn-info`

**WCAG AA Compliance Guarantee:**
All status color combinations meet ≥4.5:1 contrast ratio:
- Buttons: WCAG-compliant base colors with white text
- Badges/Alerts: Dark text on light backgrounds (light panels), bright text on dark backgrounds (system panel)
- Text utilities: Use panel-appropriate --color-text-* tokens

**Usage Pattern:**
1. Layouts set `data-panel` attribute on `<html>` element
2. CSS tokens automatically cascade based on active panel
3. Components use generic `--color-*` or `--btn-*` tokens
4. Text utilities (.text-success, etc.) automatically resolve to WCAG-compliant colors per panel

### Multi-Tenant Branding Layer (Dec 2024)
Dynamic tenant branding with CSS variable injection for runtime customization:

**ThemeProvider Features:**
- `loadTenantBranding(branding)`: Inject custom tenant colors at login
- `clearTenantBranding()`: Remove tenant branding on logout
- Secure validation: Hex/RGB/HSL color validation, font family sanitization
- Logo URL validation (HTTPS or relative paths only)
- Sidebar style options: 'dark', 'light', 'accent'

**TenantBranding Interface:**
```typescript
interface TenantBranding {
  primary?: string;      // Overrides --color-accent
  secondary?: string;    // Overrides --btn-secondary-bg
  background?: string;   // Overrides --color-bg
  surface?: string;      // Overrides --color-surface
  accent?: string;       // Direct accent color
  accentHover?: string;  // Accent hover state
  radius?: string;       // Border radius (e.g., "0.5rem")
  logo?: string;         // Brand logo URL
  fontFamily?: string;   // Custom font family
  sidebarStyle?: 'dark' | 'light' | 'accent';
  success?: string;      // Success color override
  warning?: string;      // Warning color override
  danger?: string;       // Danger color override
  info?: string;         // Info color override
}
```

**Security:** All branding values are validated before CSS injection to prevent CSS injection attacks.

**WCAG AA Contrast Enforcement (Dec 2024):**
The system guarantees ≥4.5:1 contrast ratio for ALL tenant-customizable color tokens:

1. **adjustColorForContrast() Algorithm:**
   - Iteratively adjusts background color (up to 30 iterations, 8% per step)
   - Checks contrast against both dark (#1F2937) and light (#FFFFFF) text
   - Always selects the text color with best contrast ratio
   - Returns only when ≥4.5:1 WCAG AA threshold is met

2. **Tokens Processed:**
   - Primary/Accent buttons (base + hover)
   - Secondary buttons (base + hover)
   - Sidebar accent style (base + hover + active)
   - Status colors (success, warning, danger, info)

3. **Color Input Restriction:**
   - Only 3/6-digit hex colors (#RGB or #RRGGBB) are accepted
   - No alpha channel support to ensure reliable contrast calculation

4. **Automatic Hover Derivation:**
   - If accentHover not provided, automatically darkens accent by 15%
   - Hover states are independently processed through adjustColorForContrast()

**Font Support:** Currently supports system fonts only. Custom web fonts require Google Fonts URL loading (future enhancement).

### System Panel User Management (Dec 2024)
-   **SystemUsersListPage:** Dark-themed platform users list with UserTypeSelector modal for creating System Users or Tenant Admins
-   **SystemCreateUserPage:** Dark-themed user creation form supporting two user types via URL query parameter (?type=system or ?type=tenant_admin)
-   **SystemTenantsListPage:** Dark-themed tenants management page
-   **SystemUserService:** Backend service for creating system users and tenant admins with correct scope/tenant assignments
-   **Built-in Roles:** SYSTEM_ADMIN (platform-wide, accessScope: 'system', tenantId: null) and TENANT_ADMIN (tenant-scoped, accessScope: 'tenant', tenantId: specific) with auto-grant permissions, marked as isProtected and isDefault
-   **Permission Auto-Grant:** PermissionContext grants wildcard ['*'] permissions for system and tenant_admin users
-   **Demo Credentials:** superadmin@system.local / Admin@123 (Tenant Code: SYSTEM)

### Phase 6: UX Normalization Architecture (Dec 2024) - PLANNING COMPLETE

Comprehensive architectural plan for achieving 100% UX consistency across the platform. Full documentation: `docs/PHASE6_UX_NORMALIZATION_ARCHITECTURE.md`

**Audit Findings:**
- 31+ pages contain hardcoded colors (#2563EB, #9CA3AF, #7C3AED, etc.)
- Token system is 100% complete in globals.css (Layers 0-5)
- UI components correctly use CSS variables
- Pages override components with hardcoded colors in className/style attributes
- No unified Loading/Empty/Error state components exist
- Minor layout dimension inconsistencies between panels

**Planned Architecture:**
1. **Three-Tier Token System:** Base Palette → Semantic Tokens → Component Tokens
2. **Typography Tokens:** --font-base, --font-heading with RTL switching for Cairo/Inter
3. **Spacing Tokens:** --space-1 through --space-16 matching Tailwind rhythm
4. **Unified State Components:** LoadingState, EmptyState, ErrorState with panel-aware behavior
5. **Layout Normalization:** Unified sidebar width (w-64), consistent radii, standardized padding

**Migration Strategy:**
- Wave 1: Auth + Tenant Management (6 pages)
- Wave 2: System + Branch Management (10 pages)
- Wave 3: App + Admin Panels (10+ pages)
- Estimated Duration: 5 weeks

**Future Scalability:**
- Tenant theme override architecture via runtime CSS injection
- UI versioning for enterprise contracts
- Mobile token export (JSON → React Native/Flutter/Swift)

## External Dependencies

-   **Database:** Neon Serverless PostgreSQL
-   **Real-time Communication:** Socket.IO
-   **Caching/Pub-Sub:** Redis
-   **UI Components:** Shadcn UI
-   **Internationalization:** i18next
-   **Monitoring:** Prometheus