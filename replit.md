# Veterinary ERP SaaS Platform - Phase 1

## Overview
Enterprise-grade Multi-Tenant Veterinary ERP SaaS platform built with modern technologies. This is Phase 1 - Foundation and Architecture Setup.

## Project Status
**Phase:** 1 - Foundation  
**Status:** In Development  
**Last Updated:** November 22, 2025

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

### Database Schema (Phase 1 - Foundation Only)
- `tenants` - Multi-tenant support
- `business_lines` - Business line management
- `branches` - Branch management
- `users` - User accounts
- `roles` - Role-based access control
- `permissions` - Permission system

**Note:** No ERP-specific tables in Phase 1

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
