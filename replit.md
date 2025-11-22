# Veterinary ERP SaaS Platform - Phase 1

## Overview
Enterprise-grade Multi-Tenant Veterinary ERP SaaS platform built with modern technologies. This is Phase 1 - Foundation and Architecture Setup.

## Project Status
**Phase:** 2.5 - Enterprise Tenant Module + Routing Infrastructure  
**Status:** Structure + Routing Complete  
**Database:** Neon PostgreSQL (EU-Central-1)  
**Last Updated:** November 22, 2025

### Database Configuration
- **Provider:** Neon Serverless PostgreSQL
- **Region:** EU-Central-1 (AWS)
- **Connection:** Pooled connection via Neon Pooler
- **Status:** ✅ Connected and verified
- **Schema:** ✅ Enhanced for Enterprise Tenant Module

## Architecture

### Monorepo Structure
```
/client          - React + Vite + TypeScript frontend
/server          - Node.js + Express + TypeScript backend
/types           - Shared TypeScript types
/scripts         - Build and deployment scripts
/env             - Environment configurations
```

### Technology Stack

#### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI (foundation)
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **Routing:** React Router v6
- **i18n:** i18next (Arabic RTL + English)
- **Real-time:** Socket.IO Client

#### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Real-time:** Socket.IO Server
- **Caching:** Redis (placeholder)
- **Validation:** Zod
- **Logging:** Winston

## Master Brand Guidelines

### Design System - Modern Medical Blue Theme

#### Color Palette
```css
Primary:
  - Main: #2563EB
  - Light: #3B82F6
  - Dark: #1E40AF

Secondary:
  - Main: #0EA5E9
  - Light: #7DD3FC
  - Dark: #0369A1

Accent: #14B8A6

Neutral:
  - Background: #F9FAFB
  - Surface: #FFFFFF
  - Border: #E5E7EB
  - Text: #111827
  - Text Secondary: #4B5563

Status:
  - Success: #22C55E
  - Error: #EF4444
  - Warning: #F59E0B
  - Info: #0EA5E9
```

#### Typography
- **English Font:** Inter
- **Arabic Font:** Cairo
- **Headings:** Inter, 600 weight
- **Body:** Inter + Cairo

#### Border Radius
- sm: 6px
- md: 10px
- lg: 16px
- full: 999px

## Phase 1 Deliverables

### ✅ Completed
1. Complete monorepo folder structure
2. Master Brand Guidelines and Design System
3. TypeScript configuration for all modules
4. Client boilerplate with React + Vite
5. Server boilerplate with Express
6. Database schemas (Drizzle ORM)
7. Real-time system foundation (Socket.IO)
8. AGI system folder structure
9. i18n setup (Arabic + English)
10. Authentication page placeholders
11. Layout components (Sidebar, Header, MainLayout)
12. State management setup (Zustand)
13. API client setup (Axios)
14. Middleware placeholders
15. Dev tools configuration (ESLint, Prettier)
16. **Enterprise Routing System (React Router v6)**
17. **Ultra-Premium LoginPage with RTL support**
18. **AuthLayout and DashboardLayout**
19. **7 Placeholder module pages (Dashboard, Tenants, Users, Branches, Business Lines, NotFound)**
20. **Lazy loading with Suspense**

### Database Schema (Enterprise Tenant Module)

**Enhanced Tables:**
- `tenants` - Enhanced with code, default_language, country, timezone
- `business_lines` - Enhanced with branding fields (logo_url, colors), code, description, is_active
- `branches` - Enhanced with business_line_id FK, code, city, address, is_active
- `users` - Enhanced with access_scope (system|tenant|business_line|branch) and multi-level FK support

**New Tables:**
- `branch_capacity` - Tracks allowed user count per branch

**Existing Tables (Unchanged):**
- `roles` - Role-based access control structure
- `permissions` - Permission system structure

**Note:** Full RBAC/ABAC logic planned for Phase 3

## Future Phases

### Phase 2 (Planned)
- Multi-tenant branding system with dynamic theme loading
- Authentication system with RBAC
- Real-time event system with Redis pub/sub
- AGI engine implementation
- ERP core modules

### Phase 3+ (Future)
- Appointment management
- Invoice and billing
- Inventory management
- Medical records
- Lab device integrations (IDEXX, Zoetis)
- Workflow engine
- Document templates
- Notification system

## Development

### Scripts
```bash
# Install all dependencies
npm run install:all

# Development mode (runs both client and server)
npm run dev

# Build for production
npm run build

# Run client only
npm run dev:client

# Run server only
npm run dev:server
```

### Environment Variables
See `.env.example` for required environment variables.

## Important Notes
- This is Phase 1 - Foundation Only
- No business logic implemented yet
- Placeholders and structure only
- Enterprise-grade architecture from the start
- Multi-tenant support built into foundation
