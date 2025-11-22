# 🏥 Veterinary ERP SaaS Platform

Enterprise-grade Multi-Tenant Veterinary ERP SaaS - **Phase 1: Foundation**

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Run development server
npm run dev
```

The client will be available at `http://localhost:5000`  
The server API will be available at `http://localhost:3000`

## 📁 Project Structure

```
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── providers/   # Context providers
│   │   ├── styles/      # Design system & themes
│   │   ├── i18n/        # Internationalization
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── src/
│   │   ├── api/         # Routes & controllers
│   │   ├── db/          # Database schemas
│   │   ├── services/    # Business logic
│   │   ├── realtime/    # Socket.IO
│   │   ├── ai/          # AGI engine
│   │   └── core/        # Core modules
├── types/               # Shared TypeScript types
└── scripts/             # Build scripts
```

## 🎨 Design System

This project uses a **Modern Medical Blue** design system with complete brand guidelines.  
See `client/src/styles/theme.css` for the full design tokens.

## 📚 Documentation

See `replit.md` for complete architecture and phase documentation.

## 🔧 Phase 1 Scope

This is **Phase 1** - Foundation and architecture setup only.
- ✅ Monorepo structure
- ✅ Master Brand Guidelines
- ✅ Client & Server boilerplate
- ✅ Database foundation
- ✅ Real-time system setup
- ❌ No business logic yet

## 📄 License

Proprietary - Enterprise Project
