# Phase 6: UX Normalization Architecture Plan

**Version:** 1.0  
**Date:** December 10, 2025  
**Status:** ARCHITECTURE & DESIGN ONLY (No Code)  
**Platform:** ONX Veterinary ERP SaaS

---

## Executive Summary

This document defines the complete architectural blueprint for achieving 100% UX consistency across the ONX platform. The plan ensures:

- Zero hardcoded colors or Tailwind color classes
- Full token-driven styling for every component and layout
- One-click ability to change all colors, buttons, typography, fields
- Full Arabic + English font token system
- Unified spacing, states, and layout systems
- Future-proof scalability for 3,000+ clinics

---

## 1. Complete UX Normalization Blueprint

### 1.1 Color Token Architecture

**Three-Tier Token Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 1: BASE PALETTE                     │
│  (Raw color values - never used directly in components)     │
├─────────────────────────────────────────────────────────────┤
│  --palette-blue-500: #2563EB                                │
│  --palette-blue-600: #1E40AF                                │
│  --palette-purple-500: #8B5CF6                              │
│  --palette-purple-600: #7C3AED                              │
│  --palette-teal-500: #14B8A6                                │
│  --palette-teal-600: #0D9488                                │
│  --palette-gray-50: #F9FAFB                                 │
│  --palette-gray-100: #F3F4F6                                │
│  --palette-gray-200: #E5E7EB                                │
│  --palette-gray-300: #D1D5DB                                │
│  --palette-gray-400: #9CA3AF                                │
│  --palette-gray-500: #6B7280                                │
│  --palette-gray-600: #4B5563                                │
│  --palette-gray-700: #374151                                │
│  --palette-gray-800: #1F2937                                │
│  --palette-gray-900: #111827                                │
│  --palette-neutral-50: #FAFAFA                              │
│  --palette-neutral-900: #0D0D0D                             │
│  --palette-white: #FFFFFF                                   │
│  --palette-black: #000000                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 TIER 2: SEMANTIC TOKENS                     │
│  (Contextual meaning - primary interface layer)             │
├─────────────────────────────────────────────────────────────┤
│  --color-bg: var(--palette-gray-100)                        │
│  --color-surface: var(--palette-white)                      │
│  --color-surface-hover: var(--palette-gray-50)              │
│  --color-surface-alt: var(--palette-gray-100)               │
│  --color-border: var(--palette-gray-200)                    │
│  --color-border-strong: var(--palette-gray-300)             │
│  --color-text: var(--palette-gray-900)                      │
│  --color-text-secondary: var(--palette-gray-600)            │
│  --color-text-muted: var(--palette-gray-400)                │
│  --color-accent: var(--palette-blue-500)                    │
│  --color-accent-hover: var(--palette-blue-600)              │
│  --color-accent-light: color-mix(accent, 10%)               │
│  --color-success: #15803D                                   │
│  --color-success-light: #DCFCE7                             │
│  --color-warning: #B45309                                   │
│  --color-warning-light: #FEF3C7                             │
│  --color-danger: #DC2626                                    │
│  --color-danger-light: #FEE2E2                              │
│  --color-info: #1D4ED8                                      │
│  --color-info-light: #DBEAFE                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TIER 3: COMPONENT TOKENS                     │
│  (Direct component bindings - consumed by UI primitives)    │
├─────────────────────────────────────────────────────────────┤
│  --btn-primary-bg: var(--color-accent)                      │
│  --btn-primary-text: var(--color-text-on-accent)            │
│  --btn-primary-bg-hover: var(--color-accent-hover)          │
│  --btn-secondary-bg: var(--color-surface)                   │
│  --btn-secondary-text: var(--color-text)                    │
│  --btn-secondary-border: var(--color-border)                │
│  --input-bg: var(--color-surface)                           │
│  --input-border: var(--color-border)                        │
│  --input-border-focus: var(--color-accent)                  │
│  --input-text: var(--color-text)                            │
│  --input-placeholder: var(--color-text-muted)               │
│  --card-bg: var(--color-surface)                            │
│  --card-border: var(--color-border)                         │
│  --table-header-bg: var(--color-surface-alt)                │
│  --table-row-bg: var(--color-surface)                       │
│  --table-row-bg-hover: var(--color-surface-hover)           │
│  --sidebar-bg: var(--color-surface)                         │
│  --sidebar-item-bg-hover: var(--color-surface-hover)        │
│  --sidebar-item-bg-active: var(--color-accent-light)        │
│  --sidebar-item-text-active: var(--color-accent)            │
└─────────────────────────────────────────────────────────────┘
```

**Panel Theme Cascade:**

```
┌─────────────────────────────────────────────────────────────┐
│              PANEL THEME OVERRIDE SYSTEM                    │
│  (Applied via data-panel attribute on <html>)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [data-panel="system"] {                                    │
│    --color-bg: #0D0D0D                                      │
│    --color-surface: #1A1A1A                                 │
│    --color-accent: #8B5CF6                                  │
│    --color-text: #F9FAFB                                    │
│    --color-text-secondary: #9CA3AF                          │
│    /* All component tokens auto-inherit */                  │
│  }                                                          │
│                                                             │
│  [data-panel="tenant"] {                                    │
│    --color-bg: #F8FAFC                                      │
│    --color-surface: #FFFFFF                                 │
│    --color-accent: #2563EB                                  │
│    --color-text: #0F172A                                    │
│    /* All component tokens auto-inherit */                  │
│  }                                                          │
│                                                             │
│  [data-panel="app"] {                                       │
│    --color-bg: #F0FDFA                                      │
│    --color-surface: #FFFFFF                                 │
│    --color-accent: #14B8A6                                  │
│    --color-text: #0F172A                                    │
│    /* All component tokens auto-inherit */                  │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Typography Token System

**Font Family Tokens:**

| Token | English (LTR) | Arabic (RTL) |
|-------|---------------|--------------|
| `--font-base` | 'Inter', system-ui, sans-serif | 'Cairo', 'Noto Sans Arabic', sans-serif |
| `--font-heading` | 'Inter', system-ui, sans-serif | 'Cairo', 'Noto Sans Arabic', sans-serif |
| `--font-mono` | 'JetBrains Mono', monospace | 'JetBrains Mono', monospace |

**Font Size Scale:**

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 0.75rem (12px) | 1rem | Badges, captions |
| `--text-sm` | 0.875rem (14px) | 1.25rem | Body small, labels |
| `--text-base` | 1rem (16px) | 1.5rem | Body default |
| `--text-lg` | 1.125rem (18px) | 1.75rem | Subtitles |
| `--text-xl` | 1.25rem (20px) | 1.75rem | Section titles |
| `--text-2xl` | 1.5rem (24px) | 2rem | Page headings |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | Major headings |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | Hero text |

**Font Weight Tokens:**

| Token | Weight | Usage |
|-------|--------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Labels, buttons |
| `--font-semibold` | 600 | Headings, emphasis |
| `--font-bold` | 700 | Strong emphasis |

**RTL Switching Mechanism:**

```
html[dir="ltr"] {
  --font-base: 'Inter', system-ui, sans-serif;
  --letter-spacing-base: -0.01em;
}

html[dir="rtl"] {
  --font-base: 'Cairo', 'Noto Sans Arabic', sans-serif;
  --letter-spacing-base: 0;
  --line-height-adjust: 1.1; /* Arabic needs slightly more */
}
```

### 1.3 Spacing Token System

**Spacing Scale (Matches Tailwind):**

| Token | Value | Tailwind Equivalent |
|-------|-------|---------------------|
| `--space-0` | 0 | space-0 |
| `--space-0.5` | 0.125rem (2px) | space-0.5 |
| `--space-1` | 0.25rem (4px) | space-1 |
| `--space-1.5` | 0.375rem (6px) | space-1.5 |
| `--space-2` | 0.5rem (8px) | space-2 |
| `--space-2.5` | 0.625rem (10px) | space-2.5 |
| `--space-3` | 0.75rem (12px) | space-3 |
| `--space-4` | 1rem (16px) | space-4 |
| `--space-5` | 1.25rem (20px) | space-5 |
| `--space-6` | 1.5rem (24px) | space-6 |
| `--space-8` | 2rem (32px) | space-8 |
| `--space-10` | 2.5rem (40px) | space-10 |
| `--space-12` | 3rem (48px) | space-12 |
| `--space-16` | 4rem (64px) | space-16 |

**Layout-Specific Spacing:**

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-page-padding` | var(--space-6) | Main content padding |
| `--layout-section-gap` | var(--space-6) | Between page sections |
| `--layout-card-padding` | var(--space-6) | Inside cards |
| `--layout-header-height` | 4rem (64px) | Fixed header height |
| `--layout-sidebar-width` | 16rem (256px) | Unified sidebar width |

### 1.4 Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0 | Square elements |
| `--radius-sm` | 0.125rem (2px) | Small buttons |
| `--radius-md` | 0.375rem (6px) | Default (inputs, buttons) |
| `--radius-lg` | 0.5rem (8px) | Cards, dialogs |
| `--radius-xl` | 0.75rem (12px) | Large cards |
| `--radius-2xl` | 1rem (16px) | Hero sections |
| `--radius-full` | 9999px | Pills, avatars |
| `--radius` | var(--radius-md) | System default |

### 1.5 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle depth |
| `--shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards, buttons |
| `--shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Modals, dropdowns |
| `--shadow-xl` | 0 20px 25px rgba(0,0,0,0.1) | Overlays |

---

## 2. Migration Map for Entire Codebase

### 2.1 Page Priority Classification

**Wave 1: HIGH PRIORITY (Auth + Core Management)**

| Page | Hardcoded Items | Complexity | Risk |
|------|-----------------|------------|------|
| LoginPage.tsx | 15+ colors | High | High (visibility) |
| AuthLayout.tsx | 1 color | Low | Medium |
| CreateTenantPage.tsx | 10+ colors | High | Medium |
| EditTenantPage.tsx | 8+ colors | Medium | Medium |
| TenantsListPage.tsx | 6+ colors | Medium | Medium |
| TenantDetailPage.tsx | 6+ colors | Medium | Low |

**Wave 2: MEDIUM PRIORITY (System + Branch Management)**

| Page | Hardcoded Items | Complexity | Risk |
|------|-----------------|------------|------|
| SystemUsersListPage.tsx | 8+ colors | High | Medium |
| SystemTenantsListPage.tsx | 5+ colors | Medium | Medium |
| SystemCreateUserPage.tsx | 3+ colors | Medium | Medium |
| SystemRolesPage.tsx | 3+ colors | Low | Low |
| SystemDPFPage.tsx | 1+ colors | Low | Low |
| BusinessLinesListPage.tsx | 5+ colors | Medium | Low |
| CreateBusinessLinePage.tsx | 5+ colors | Medium | Low |
| BranchesListPage.tsx | 3+ colors | Medium | Low |
| CreateBranchPage.tsx | 6+ colors | Medium | Low |

**Wave 3: LOW PRIORITY (Dashboards + App Pages)**

| Page | Hardcoded Items | Complexity | Risk |
|------|-----------------|------------|------|
| DashboardHomePage.tsx | 5+ colors | Medium | Low |
| Dashboard.tsx | 2+ colors | Low | Low |
| SystemDashboard.tsx | Token-based | Low | Low |
| AdminDashboard.tsx | Token-based | Low | Low |
| AppDashboard.tsx | Token-based | Low | Low |
| UsersListPage.tsx | 3+ colors | Medium | Low |
| CreateUserPage.tsx | 3+ colors | Medium | Low |
| RolesPage.tsx | 2+ colors | Low | Low |
| App panel pages (5) | Mixed | Low | Low |

### 2.2 Token Replacement Patterns

**Hardcoded Color → Token Mapping:**

| Hardcoded Value | Token Replacement | Context |
|-----------------|-------------------|---------|
| `#2563EB` | `var(--color-accent)` | Primary blue |
| `#1E40AF` | `var(--color-accent-hover)` | Blue hover |
| `#9CA3AF` | `var(--color-text-muted)` | Muted text/icons |
| `#F3F4F6` | `var(--color-bg)` | Page background |
| `#FFFFFF` | `var(--color-surface)` | Card/surface |
| `#F9FAFB` | `var(--color-surface-hover)` | Hover states |
| `#8B5CF6` | `var(--sys-accent)` | System panel accent |
| `#7C3AED` | `var(--sys-accent-hover)` | System accent hover |
| `#14B8A6` | `var(--app-accent)` | App panel accent |
| `#9333EA` | `var(--color-accent)` (system context) | System user indicator |
| `#3B82F6` | `var(--color-accent)` (tenant context) | Tenant admin indicator |

**Tailwind Color → Token Mapping:**

| Tailwind Class | Token Replacement |
|----------------|-------------------|
| `bg-white` | `bg-surface` or `style={{ backgroundColor: 'var(--color-surface)' }}` |
| `bg-gray-50` | `style={{ backgroundColor: 'var(--color-surface-hover)' }}` |
| `bg-gray-100` | `style={{ backgroundColor: 'var(--color-surface-alt)' }}` |
| `bg-gray-200` | `style={{ backgroundColor: 'var(--color-border)' }}` |
| `text-red-600` | `style={{ color: 'var(--color-danger)' }}` |
| `text-red-400` | `style={{ color: 'var(--color-danger)' }}` |
| `hover:bg-gray-50` | `style onHover` with `var(--color-surface-hover)` |

**Inline Style → Token Migration:**

```
BEFORE:
style={{ color: '#9CA3AF' }}
style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
className="bg-[#2563EB] hover:bg-[#1E40AF]"
className="text-[#9CA3AF]"

AFTER:
style={{ color: 'var(--color-text-muted)' }}
<Button variant="default" />  (uses --btn-primary-*)
<Button variant="default" />  (component handles this)
style={{ color: 'var(--color-text-muted)' }}
```

### 2.3 Migration Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION SEQUENCE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE A: Foundation (Week 1)                               │
│  ├── 1. Add missing tokens to globals.css                   │
│  ├── 2. Create LoadingState component                       │
│  ├── 3. Create EmptyState component                         │
│  ├── 4. Create ErrorState component                         │
│  └── 5. Normalize layout dimensions                         │
│                                                             │
│  PHASE B: Wave 1 Migration (Week 2)                         │
│  ├── 1. Migrate AuthLayout.tsx                              │
│  ├── 2. Migrate LoginPage.tsx                               │
│  ├── 3. Migrate CreateTenantPage.tsx                        │
│  ├── 4. Migrate EditTenantPage.tsx                          │
│  ├── 5. Migrate TenantsListPage.tsx                         │
│  └── 6. Migrate TenantDetailPage.tsx                        │
│                                                             │
│  PHASE C: Wave 2 Migration (Week 3)                         │
│  ├── 1. Migrate System panel pages (6)                      │
│  ├── 2. Migrate Business line pages (2)                     │
│  └── 3. Migrate Branch pages (2)                            │
│                                                             │
│  PHASE D: Wave 3 Migration (Week 4)                         │
│  ├── 1. Migrate Dashboard pages (4)                         │
│  ├── 2. Migrate User management pages (2)                   │
│  ├── 3. Migrate App panel pages (5)                         │
│  └── 4. Migrate remaining pages                             │
│                                                             │
│  PHASE E: Verification (Week 5)                             │
│  ├── 1. Visual regression testing                           │
│  ├── 2. RTL layout verification                             │
│  ├── 3. Panel theme switching tests                         │
│  └── 4. Tenant branding tests                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Unified Component Strategy

### 3.1 Component API Standards

**Universal Prop Contract:**

```typescript
interface BaseComponentProps {
  // Variants
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning' | 'info';
  
  // Sizes
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  // States
  loading?: boolean;
  disabled?: boolean;
  error?: boolean;
  
  // Panel awareness (optional - inherits from context)
  panelTone?: 'system' | 'tenant' | 'app';
  
  // Standard HTML
  className?: string;
  style?: React.CSSProperties;
}
```

### 3.2 Component Specifications

**Button:**

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| default | `--btn-primary-bg` | `--btn-primary-text` | none | opacity 90% |
| secondary | `--btn-secondary-bg` | `--btn-secondary-text` | `--btn-secondary-border` | opacity 90% |
| outline | transparent | `--color-text` | `--color-border` | `--color-surface-hover` |
| ghost | transparent | `--color-text-secondary` | none | `--btn-ghost-bg-hover` |
| destructive | `--btn-danger-bg` | `--btn-danger-text` | none | opacity 90% |
| success | `--btn-success-bg` | `--btn-success-text` | none | opacity 90% |
| warning | `--btn-warning-bg` | `--btn-warning-text` | none | opacity 90% |
| info | `--btn-info-bg` | `--btn-info-text` | none | opacity 90% |

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| xs | 1.75rem (28px) | 0.5rem | 0.75rem |
| sm | 2.25rem (36px) | 0.75rem | 0.875rem |
| md | 2.5rem (40px) | 1rem | 0.875rem |
| lg | 2.75rem (44px) | 1.5rem | 1rem |
| xl | 3rem (48px) | 2rem | 1.125rem |

**Input:**

| State | Background | Border | Text |
|-------|------------|--------|------|
| default | `--input-bg` | `--input-border` | `--input-text` |
| focus | `--input-bg` | `--input-border-focus` | `--input-text` |
| error | `--input-bg` | `--input-error-border` | `--input-text` |
| disabled | `--color-surface-alt` | `--color-border` | `--color-text-muted` |

**Card:**

| Variant | Background | Border | Shadow |
|---------|------------|--------|--------|
| default | `--card-bg` | `--card-border` | `--card-shadow` |
| outline | transparent | `--card-border` | none |
| elevated | `--card-bg` | transparent | `--shadow-lg` |
| ghost | transparent | transparent | none |

**Table:**

| Element | Background | Text | Border |
|---------|------------|------|--------|
| header | `--table-header-bg` | `--color-text` | `--color-border` |
| row | `--table-row-bg` | `--color-text` | `--color-border` |
| row-hover | `--table-row-bg-hover` | `--color-text` | `--color-border` |
| row-selected | `--color-accent-light` | `--color-accent` | `--color-accent` |

**Dialog/Modal:**

| Element | Value |
|---------|-------|
| background | `--modal-bg` |
| border | `--modal-border` |
| overlay | `--modal-overlay` (rgba(0,0,0,0.5)) |
| border-radius | `--radius-xl` |
| shadow | `--shadow-xl` |

**Alert:**

| Variant | Background | Text | Border | Icon |
|---------|------------|------|--------|------|
| success | `--alert-success-bg` | `--alert-success-text` | `--alert-success-border` | CheckCircle |
| warning | `--alert-warning-bg` | `--alert-warning-text` | `--alert-warning-border` | AlertTriangle |
| danger | `--alert-danger-bg` | `--alert-danger-text` | `--alert-danger-border` | XCircle |
| info | `--alert-info-bg` | `--alert-info-text` | `--alert-info-border` | Info |

**Badge:**

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| default | `--color-surface-alt` | `--color-text-secondary` | none |
| success | `--badge-success-bg` | `--badge-success-text` | `--badge-success-border` |
| warning | `--badge-warning-bg` | `--badge-warning-text` | `--badge-warning-border` |
| danger | `--badge-danger-bg` | `--badge-danger-text` | `--badge-danger-border` |
| info | `--badge-info-bg` | `--badge-info-text` | `--badge-info-border` |

### 3.3 Form Field Standards

**FormField Component Spec:**

```
┌─────────────────────────────────────────────────────────────┐
│  FormField Layout                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Label (--color-text, --text-sm, --font-medium)       │   │
│  │ * required indicator (--color-danger)                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ↓ gap: --space-1.5                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Input/Select/Textarea                                │   │
│  │ (uses component tokens)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ↓ gap: --space-1                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Helper text (--color-text-muted, --text-xs)          │   │
│  │ OR                                                   │   │
│  │ Error text (--color-danger, --text-xs)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Token-Based Design System Plan

### 4.1 Token Naming Conventions

**Pattern:** `--[scope]-[element]-[property]-[state]`

| Scope | Examples |
|-------|----------|
| color | `--color-text`, `--color-bg`, `--color-accent` |
| btn | `--btn-primary-bg`, `--btn-secondary-text` |
| input | `--input-bg`, `--input-border-focus` |
| card | `--card-bg`, `--card-shadow` |
| table | `--table-header-bg`, `--table-row-bg-hover` |
| sidebar | `--sidebar-bg`, `--sidebar-item-bg-active` |
| modal | `--modal-bg`, `--modal-overlay` |
| badge | `--badge-success-bg`, `--badge-warning-text` |
| alert | `--alert-info-bg`, `--alert-danger-border` |

### 4.2 Theme Switching Mechanism

**Panel Theme Switching:**

```
┌─────────────────────────────────────────────────────────────┐
│                 THEME SWITCHING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Layout component mounts                                 │
│     └── useEffect(() => {                                   │
│           document.documentElement.setAttribute(            │
│             'data-panel', 'system' | 'tenant' | 'app'       │
│           );                                                │
│         }, []);                                              │
│                                                             │
│  2. CSS cascade applies panel-specific values               │
│     └── [data-panel="system"] {                             │
│           --color-bg: #0D0D0D;                              │
│           --color-accent: #8B5CF6;                          │
│           ...                                               │
│         }                                                   │
│                                                             │
│  3. All component tokens inherit automatically              │
│     └── --btn-primary-bg: var(--color-accent);              │
│         (resolves to #8B5CF6 in system panel)               │
│                                                             │
│  4. Components render with correct theme                    │
│     └── No code changes needed in components                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Font Switching (Arabic/English)

```
┌─────────────────────────────────────────────────────────────┐
│                  FONT SWITCHING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. i18n detects language change                            │
│     └── document.documentElement.lang = 'ar';               │
│         document.documentElement.dir = 'rtl';               │
│                                                             │
│  2. CSS applies RTL font tokens                             │
│     └── html[dir="rtl"] {                                   │
│           --font-base: 'Cairo', sans-serif;                 │
│           --letter-spacing-base: 0;                         │
│         }                                                   │
│                                                             │
│  3. All text elements inherit font                          │
│     └── body { font-family: var(--font-base); }             │
│                                                             │
│  4. Layout components flip via flex-row-reverse             │
│     └── Handled by isRTL state in layouts                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Tenant Branding Override Mechanism

**Runtime Branding Injection:**

```
┌─────────────────────────────────────────────────────────────┐
│              TENANT BRANDING FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User logs in → API returns tenant branding              │
│     └── { primary: '#FF5722', accent: '#E91E63', ... }      │
│                                                             │
│  2. ThemeProvider.loadTenantBranding(branding)              │
│     └── Validates all color values (hex only)               │
│     └── Checks WCAG contrast ratios                         │
│     └── Adjusts colors if needed for accessibility          │
│                                                             │
│  3. Inject CSS variables on <body data-brand="custom">      │
│     └── --tenant-primary: #FF5722;                          │
│     └── --color-accent: var(--tenant-primary);              │
│                                                             │
│  4. All components automatically use tenant colors          │
│     └── No component code changes needed                    │
│                                                             │
│  5. User logs out → clearTenantBranding()                   │
│     └── Remove data-brand attribute                         │
│     └── Revert to default panel theme                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Color Propagation Rules

**Automatic Inheritance Chain:**

```
Base Palette → Semantic Tokens → Component Tokens → Rendered UI

Example propagation:
--palette-blue-500: #2563EB
    ↓
--color-accent: var(--palette-blue-500)
    ↓
--btn-primary-bg: var(--color-accent)
    ↓
Button component uses --btn-primary-bg
    ↓
User sees blue button

To change ALL blue elements to purple:
Just change: --color-accent: #8B5CF6
Everything cascades automatically.
```

---

## 5. Layout Normalization Plan

### 5.1 Unified Sidebar Dimensions

**Standard Dimensions (All Panels):**

| Property | Value | Tailwind |
|----------|-------|----------|
| Width (desktop) | 16rem (256px) | w-64 |
| Width (mobile) | 16rem (256px) | w-64 |
| Logo container height | 4rem (64px) | h-16 |
| Logo icon size | 2rem (32px) | w-8 h-8 |
| Nav item padding | 0.75rem 1rem | px-3 py-2.5 |
| Nav item border-radius | var(--radius-lg) | rounded-lg |
| Nav section gap | 0.25rem | space-y-1 |
| Footer padding | 1rem | p-4 |

### 5.2 Consistent Padding/Spacing

**Page Layout:**

| Element | Padding/Gap | Token |
|---------|-------------|-------|
| Main content | 1.5rem (24px) | p-6 / --layout-page-padding |
| Section gap | 1.5rem (24px) | space-y-6 / --layout-section-gap |
| Header height | 4rem (64px) | h-16 / --layout-header-height |
| Card padding | 1.5rem (24px) | p-6 / --layout-card-padding |
| Form field gap | 1rem (16px) | space-y-4 |
| Button gap in groups | 0.5rem (8px) | gap-2 |

### 5.3 Border Radius Standardization

**Standard Radii:**

| Element | Radius | Token |
|---------|--------|-------|
| Buttons | 0.375rem | var(--radius-md) |
| Inputs | 0.375rem | var(--radius-md) |
| Cards | 0.5rem | var(--radius-lg) |
| Dialogs | 0.75rem | var(--radius-xl) |
| Sidebar logo | 0.5rem | var(--radius-lg) |
| Sidebar items | 0.5rem | var(--radius-lg) |
| Avatars | 9999px | var(--radius-full) |
| Badges | 9999px | var(--radius-full) |

### 5.4 Surface Layering Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  SURFACE ELEVATION STACK                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Level 0: Page Background                                   │
│  └── --color-bg (darkest/lightest depending on panel)       │
│                                                             │
│  Level 1: Primary Surface (cards, sidebar)                  │
│  └── --color-surface                                        │
│                                                             │
│  Level 2: Interactive Surface (hover states)                │
│  └── --color-surface-hover                                  │
│                                                             │
│  Level 3: Elevated Surface (dropdowns, modals)              │
│  └── --color-surface + --shadow-lg                          │
│                                                             │
│  Level 4: Overlay (modal backdrops)                         │
│  └── --modal-overlay (semi-transparent)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Header/Footer Consistency

**Header Standards:**

| Property | Value |
|----------|-------|
| Height | 4rem (64px) |
| Background | var(--color-surface) |
| Border | 1px bottom, var(--color-border) |
| Padding | 1.5rem horizontal |
| Shadow | none (border provides separation) |

**Footer (Sidebar):**

| Property | Value |
|----------|-------|
| Padding | 1rem |
| Border | 1px top, var(--color-border) |
| Background | inherit from sidebar |

---

## 6. Unified UI State System

### 6.1 LoadingState Component Spec

**Props Interface:**

```typescript
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'muted';
  message?: string;
  fullPage?: boolean;
}
```

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│                    LoadingState Layout                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            [flex items-center justify-center]        │   │
│  │                                                      │   │
│  │     ○○○○○○○○○○○○                                    │   │
│  │     Spinner (animate-spin)                          │   │
│  │     Color: var(--color-accent) or var(--color-text-muted) │
│  │     Size: sm=20px, md=32px, lg=48px                 │   │
│  │                                                      │   │
│  │     "Loading..." (optional)                         │   │
│  │     Color: var(--color-text-secondary)              │   │
│  │     Font: var(--text-sm)                            │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Sizes:                                                     │
│  - sm: Inline, h-5 w-5, no text                             │
│  - md: Block, h-8 w-8, optional text                        │
│  - lg: Full area, h-12 w-12, text below                     │
│                                                             │
│  fullPage: Adds min-h-[50vh] centering                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Token Usage:**

| Property | Token |
|----------|-------|
| Spinner color (accent) | var(--color-accent) |
| Spinner color (muted) | var(--color-text-muted) |
| Text color | var(--color-text-secondary) |
| Background | transparent (inherits) |

### 6.2 EmptyState Component Spec

**Props Interface:**

```typescript
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
  size?: 'sm' | 'md' | 'lg';
}
```

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│                    EmptyState Layout                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          [flex flex-col items-center text-center]    │   │
│  │                                                      │   │
│  │     ┌──────────────────────┐                        │   │
│  │     │   Icon Container     │                        │   │
│  │     │   w-12 h-12          │                        │   │
│  │     │   bg: var(--color-accent-light)               │   │
│  │     │   rounded-full       │                        │   │
│  │     │   Icon: var(--color-accent)                   │   │
│  │     └──────────────────────┘                        │   │
│  │     ↓ gap: --space-4                                │   │
│  │     Title                                           │   │
│  │     Color: var(--color-text)                        │   │
│  │     Font: var(--text-lg) --font-semibold            │   │
│  │     ↓ gap: --space-2                                │   │
│  │     Description (optional)                          │   │
│  │     Color: var(--color-text-secondary)              │   │
│  │     Font: var(--text-sm)                            │   │
│  │     ↓ gap: --space-4                                │   │
│  │     [Action Button] (optional)                      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Sizes:                                                     │
│  - sm: Icon w-8 h-8, compact spacing                        │
│  - md: Icon w-12 h-12, standard spacing                     │
│  - lg: Icon w-16 h-16, generous spacing, larger text        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Token Usage:**

| Property | Token |
|----------|-------|
| Icon background | var(--color-accent-light) |
| Icon color | var(--color-accent) |
| Title color | var(--color-text) |
| Description color | var(--color-text-secondary) |
| Action button | Uses Button component defaults |

### 6.3 ErrorState Component Spec

**Props Interface:**

```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string | number;
  retryAction?: () => void;
  retryLabel?: string;
  backAction?: () => void;
  backLabel?: string;
  variant?: 'inline' | 'page';
}
```

**Visual Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ErrorState Layout                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INLINE VARIANT:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Alert variant="danger"]                            │   │
│  │                                                      │   │
│  │  ⚠️ Error Title                                     │   │
│  │  Error message describing what went wrong           │   │
│  │                                                      │   │
│  │  [Retry Button]                                     │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PAGE VARIANT:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          [flex flex-col items-center text-center]    │   │
│  │                                                      │   │
│  │     ┌──────────────────────┐                        │   │
│  │     │   Icon Container     │                        │   │
│  │     │   bg: var(--color-danger-light)               │   │
│  │     │   Icon: XCircle                               │   │
│  │     │   Color: var(--color-danger)                  │   │
│  │     └──────────────────────┘                        │   │
│  │     ↓ gap: --space-4                                │   │
│  │     Error Code (optional)                           │   │
│  │     Color: var(--color-danger)                      │   │
│  │     Font: var(--text-xs) monospace                  │   │
│  │     ↓ gap: --space-2                                │   │
│  │     Title                                           │   │
│  │     Color: var(--color-text)                        │   │
│  │     ↓ gap: --space-2                                │   │
│  │     Message                                         │   │
│  │     Color: var(--color-text-secondary)              │   │
│  │     ↓ gap: --space-4                                │   │
│  │     [Retry] [Go Back]                               │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Token Usage:**

| Property | Token |
|----------|-------|
| Icon background | var(--color-danger-light) |
| Icon color | var(--color-danger) |
| Error code | var(--color-danger), --font-mono |
| Title | var(--color-text) |
| Message | var(--color-text-secondary) |
| Retry button | Button variant="default" |
| Back button | Button variant="outline" |

### 6.4 Panel-Aware Behavior

All state components automatically adapt to the current panel:

```
┌─────────────────────────────────────────────────────────────┐
│              PANEL-AWARE STATE BEHAVIOR                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  System Panel [data-panel="system"]:                        │
│  └── LoadingState spinner: #8B5CF6 (purple)                 │
│  └── EmptyState icon bg: rgba(139, 92, 246, 0.2)            │
│  └── ErrorState uses dark-mode danger colors                │
│                                                             │
│  Tenant Panel [data-panel="tenant"]:                        │
│  └── LoadingState spinner: #2563EB (blue)                   │
│  └── EmptyState icon bg: rgba(37, 99, 235, 0.1)             │
│  └── ErrorState uses light-mode danger colors               │
│                                                             │
│  App Panel [data-panel="app"]:                              │
│  └── LoadingState spinner: #14B8A6 (teal)                   │
│  └── EmptyState icon bg: rgba(20, 184, 166, 0.1)            │
│  └── ErrorState uses light-mode danger colors               │
│                                                             │
│  Implementation: Components read var(--color-accent)        │
│  which resolves differently per panel                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Step-by-Step Execution Plan

### 7.1 Chronological Task List

```
┌─────────────────────────────────────────────────────────────┐
│           PHASE 6 EXECUTION TIMELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  WEEK 1: FOUNDATION                                         │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Day 1-2: Token System Completion                           │
│  ├── Task 1.1: Add --space-* tokens to globals.css          │
│  ├── Task 1.2: Add --font-* tokens with RTL support         │
│  ├── Task 1.3: Add missing component tokens                 │
│  ├── Task 1.4: Document token reference table               │
│  └── Checkpoint: Token audit passes                         │
│                                                             │
│  Day 3-4: State Components                                  │
│  ├── Task 2.1: Create LoadingState component                │
│  ├── Task 2.2: Create EmptyState component                  │
│  ├── Task 2.3: Create ErrorState component                  │
│  ├── Task 2.4: Export from components/ui/index.ts           │
│  └── Checkpoint: State components render in all panels      │
│                                                             │
│  Day 5: Layout Normalization                                │
│  ├── Task 3.1: Standardize UserAppLayout sidebar to w-64    │
│  ├── Task 3.2: Unify border radii across layouts            │
│  ├── Task 3.3: Align nav padding/spacing                    │
│  └── Checkpoint: All 3 layouts visually identical           │
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  WEEK 2: WAVE 1 - AUTH + TENANT MANAGEMENT                  │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Day 6: Auth Pages                                          │
│  ├── Task 4.1: Migrate AuthLayout.tsx                       │
│  ├── Task 4.2: Migrate LoginPage.tsx (15+ colors)           │
│  └── Checkpoint: Login flow works with tokens               │
│                                                             │
│  Day 7-8: Tenant CRUD Pages                                 │
│  ├── Task 5.1: Migrate CreateTenantPage.tsx                 │
│  ├── Task 5.2: Migrate EditTenantPage.tsx                   │
│  ├── Task 5.3: Migrate TenantsListPage.tsx                  │
│  ├── Task 5.4: Migrate TenantDetailPage.tsx                 │
│  └── Checkpoint: Tenant CRUD uses tokens                    │
│                                                             │
│  Day 9-10: Dashboard Migration                              │
│  ├── Task 6.1: Migrate DashboardHomePage.tsx                │
│  ├── Task 6.2: Migrate Dashboard.tsx (legacy)               │
│  └── Checkpoint: All dashboards use tokens                  │
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  WEEK 3: WAVE 2 - SYSTEM + BRANCH MANAGEMENT                │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Day 11-12: System Panel Pages                              │
│  ├── Task 7.1: Migrate SystemUsersListPage.tsx              │
│  ├── Task 7.2: Migrate SystemTenantsListPage.tsx            │
│  ├── Task 7.3: Migrate SystemCreateUserPage.tsx             │
│  ├── Task 7.4: Migrate SystemRolesPage.tsx                  │
│  ├── Task 7.5: Migrate SystemDPFPage.tsx                    │
│  └── Checkpoint: System panel fully tokenized               │
│                                                             │
│  Day 13-14: Branch/Business Line Pages                      │
│  ├── Task 8.1: Migrate BusinessLinesListPage.tsx            │
│  ├── Task 8.2: Migrate CreateBusinessLinePage.tsx           │
│  ├── Task 8.3: Migrate BranchesListPage.tsx                 │
│  ├── Task 8.4: Migrate CreateBranchPage.tsx                 │
│  └── Checkpoint: Hierarchy pages fully tokenized            │
│                                                             │
│  Day 15: User Management Pages                              │
│  ├── Task 9.1: Migrate UsersListPage.tsx                    │
│  ├── Task 9.2: Migrate CreateUserPage.tsx                   │
│  ├── Task 9.3: Migrate RolesPage.tsx                        │
│  └── Checkpoint: User/role pages fully tokenized            │
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  WEEK 4: WAVE 3 - APP PANEL + REMAINING                     │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Day 16-17: App Panel Pages                                 │
│  ├── Task 10.1: Audit AppDashboard.tsx (likely clean)       │
│  ├── Task 10.2: Migrate AppPatientsPage.tsx                 │
│  ├── Task 10.3: Migrate AppAppointmentsPage.tsx             │
│  ├── Task 10.4: Migrate AppTasksPage.tsx                    │
│  ├── Task 10.5: Migrate AppReportsPage.tsx                  │
│  └── Checkpoint: App panel fully tokenized                  │
│                                                             │
│  Day 18-19: Admin Panel + Cleanup                           │
│  ├── Task 11.1: Audit AdminDashboard.tsx (likely clean)     │
│  ├── Task 11.2: Migrate AdminSettingsPage.tsx               │
│  ├── Task 11.3: Migrate RolePermissionsPage.tsx             │
│  ├── Task 11.4: Migrate UserRoleAssignmentPage.tsx          │
│  ├── Task 11.5: Migrate NotFoundPage.tsx                    │
│  └── Checkpoint: All pages fully tokenized                  │
│                                                             │
│  Day 20: Global Cleanup                                     │
│  ├── Task 12.1: Remove all Tailwind color classes           │
│  ├── Task 12.2: Remove all inline hex colors                │
│  ├── Task 12.3: Standardize gradient syntax                 │
│  └── Checkpoint: Zero hardcoded colors in codebase          │
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  WEEK 5: VERIFICATION + DOCUMENTATION                       │
│  ══════════════════════════════════════════════════════    │
│                                                             │
│  Day 21-22: Visual Regression Testing                       │
│  ├── Task 13.1: Screenshot all pages (LTR)                  │
│  ├── Task 13.2: Screenshot all pages (RTL)                  │
│  ├── Task 13.3: Test panel theme switching                  │
│  ├── Task 13.4: Test tenant branding injection              │
│  └── Checkpoint: All visual tests pass                      │
│                                                             │
│  Day 23-24: Accessibility Verification                      │
│  ├── Task 14.1: WCAG AA contrast audit                      │
│  ├── Task 14.2: Screen reader testing                       │
│  ├── Task 14.3: Keyboard navigation testing                 │
│  └── Checkpoint: All a11y tests pass                        │
│                                                             │
│  Day 25: Documentation                                      │
│  ├── Task 15.1: Update replit.md with token system          │
│  ├── Task 15.2: Create token reference doc                  │
│  ├── Task 15.3: Create component usage guide                │
│  ├── Task 15.4: Mark Phase 6 complete                       │
│  └── Checkpoint: Phase 6 COMPLETE                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Risk Assessment

| Task Category | Risk Level | Potential Issues | Mitigation |
|---------------|------------|------------------|------------|
| Token additions | Low | CSS cascade conflicts | Test in isolation first |
| State components | Low | Prop mismatches | TypeScript strict types |
| Layout normalization | Medium | Sidebar shift affecting nav | Responsive QA at each breakpoint |
| LoginPage migration | High | Auth flow breaks | Full E2E test after |
| System panel migration | Medium | Dark theme contrast | WCAG checker per page |
| Gradient syntax | Medium | CSS parsing errors | Test per browser |

### 7.3 Verification Checkpoints

| Checkpoint | Criteria | Pass/Fail |
|------------|----------|-----------|
| Token audit | All --color-*, --btn-*, --input-* tokens defined | |
| State components | LoadingState, EmptyState, ErrorState render correctly | |
| Layout consistency | All 3 layouts have identical dimensions | |
| Wave 1 complete | Auth + Tenant pages use tokens only | |
| Wave 2 complete | System + Branch pages use tokens only | |
| Wave 3 complete | App + Admin pages use tokens only | |
| Zero hardcoded | grep finds 0 hex colors in pages/ | |
| RTL correct | All pages render correctly in Arabic | |
| Branding works | Tenant colors apply at runtime | |
| WCAG AA | All color combinations ≥4.5:1 contrast | |

### 7.4 Rollback Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   ROLLBACK STRATEGY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GRANULARITY: Per-wave branches                             │
│                                                             │
│  main                                                       │
│   │                                                         │
│   ├── phase6/foundation                                     │
│   │    └── Tokens, state components, layout fixes           │
│   │                                                         │
│   ├── phase6/wave1-auth-tenant                              │
│   │    └── Auth + Tenant page migrations                    │
│   │                                                         │
│   ├── phase6/wave2-system-branch                            │
│   │    └── System + Branch page migrations                  │
│   │                                                         │
│   ├── phase6/wave3-app-admin                                │
│   │    └── App + Admin page migrations                      │
│   │                                                         │
│   └── phase6/complete                                       │
│        └── Final verification + docs                        │
│                                                             │
│  ROLLBACK PROCEDURE:                                        │
│  1. Identify failed wave                                    │
│  2. git revert to previous wave branch                      │
│  3. Fix issues on failed branch                             │
│  4. Re-merge with fixes                                     │
│                                                             │
│  CHECKPOINT SNAPSHOTS:                                      │
│  - Create Replit checkpoint after each wave                 │
│  - Tag git commits at each checkpoint                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Future Scalability Rules

### 8.1 Tenant Theme Override Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              TENANT THEME OVERRIDE SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATABASE SCHEMA:                                           │
│  tenants table:                                             │
│  ├── branding_primary: varchar(7) -- #RRGGBB               │
│  ├── branding_secondary: varchar(7)                         │
│  ├── branding_accent: varchar(7)                            │
│  ├── branding_logo_url: text                                │
│  ├── branding_font_family: varchar(100)                     │
│  ├── branding_sidebar_style: enum('dark','light','accent')  │
│  └── branding_radius: varchar(20)                           │
│                                                             │
│  API RESPONSE (on login):                                   │
│  {                                                          │
│    "tenant": {                                              │
│      "branding": {                                          │
│        "primary": "#FF5722",                                │
│        "secondary": "#E91E63",                              │
│        "accent": "#FF5722",                                 │
│        "logo": "/uploads/tenant/logo.png",                  │
│        "fontFamily": "Poppins",                             │
│        "sidebarStyle": "accent",                            │
│        "radius": "0.75rem"                                  │
│      }                                                      │
│    }                                                        │
│  }                                                          │
│                                                             │
│  RUNTIME INJECTION:                                         │
│  ThemeProvider.loadTenantBranding(branding)                 │
│  └── Validates colors for WCAG compliance                   │
│  └── Sets CSS variables on <body data-brand="custom">       │
│  └── Overrides --color-accent, --btn-primary-bg, etc.       │
│                                                             │
│  CLEAR ON LOGOUT:                                           │
│  ThemeProvider.clearTenantBranding()                        │
│  └── Removes data-brand attribute                           │
│  └── Reverts to panel default theme                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Dynamic Branding Injection

**CSS Variable Injection Order:**

```
1. Base tokens (always present)
   └── :root { --color-accent: #2563EB; }

2. Panel theme (via data-panel)
   └── [data-panel="tenant"] { --color-accent: #2563EB; }

3. Tenant branding (via data-brand)
   └── [data-brand="custom"] { --color-accent: var(--tenant-primary); }

Priority: Tenant branding > Panel theme > Base tokens
```

**Font Loading for Tenant Fonts:**

```
1. Tenant specifies fontFamily: "Poppins"
2. ThemeProvider checks if font is loaded
3. If not, injects Google Fonts link dynamically:
   <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet">
4. Sets --font-base: 'Poppins', var(--font-fallback);
```

### 8.3 Enterprise UI Versioning

```
┌─────────────────────────────────────────────────────────────┐
│              UI VERSIONING STRATEGY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VERSION STRUCTURE:                                         │
│  /styles/tokens/                                            │
│  ├── v1.0/                                                  │
│  │   ├── colors.css                                         │
│  │   ├── typography.css                                     │
│  │   └── spacing.css                                        │
│  ├── v1.1/                                                  │
│  │   ├── colors.css  (adds new accent shades)               │
│  │   └── ...                                                │
│  └── v2.0/                                                  │
│      └── (breaking changes)                                 │
│                                                             │
│  TENANT VERSION LOCKING:                                    │
│  tenants table:                                             │
│  └── ui_version: varchar(10) default 'v1.0'                 │
│                                                             │
│  APP LOADS VERSIONED TOKENS:                                │
│  import(`/styles/tokens/${tenant.uiVersion}/colors.css`)    │
│                                                             │
│  MIGRATION PATH:                                            │
│  - New features → New minor version (v1.0 → v1.1)           │
│  - Breaking changes → New major version (v1.x → v2.0)       │
│  - Tenants opt-in to upgrades                               │
│  - Minimum 6-month deprecation for old versions             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Mobile App Considerations

```
┌─────────────────────────────────────────────────────────────┐
│              MOBILE DESIGN TOKEN STRATEGY                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SHARED TOKEN EXPORT:                                       │
│  tokens.json (generated from globals.css)                   │
│  {                                                          │
│    "colors": {                                              │
│      "accent": "#2563EB",                                   │
│      "surface": "#FFFFFF",                                  │
│      ...                                                    │
│    },                                                       │
│    "spacing": {                                             │
│      "1": "4px",                                            │
│      "2": "8px",                                            │
│      ...                                                    │
│    }                                                        │
│  }                                                          │
│                                                             │
│  MOBILE PLATFORM CONSUMPTION:                               │
│                                                             │
│  React Native:                                              │
│  import tokens from './tokens.json';                        │
│  const styles = StyleSheet.create({                         │
│    button: { backgroundColor: tokens.colors.accent }        │
│  });                                                        │
│                                                             │
│  Flutter:                                                   │
│  class AppTheme {                                           │
│    static const accent = Color(0xFF2563EB);                 │
│  }                                                          │
│                                                             │
│  iOS (Swift):                                               │
│  extension UIColor {                                        │
│    static let accent = UIColor(hex: "#2563EB")              │
│  }                                                          │
│                                                             │
│  BUILD PIPELINE:                                            │
│  1. globals.css → tokens.json (CSS to JSON converter)       │
│  2. tokens.json → platform-specific files                   │
│  3. CI/CD syncs across web + mobile repos                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 3000+ Clinic Scalability

**Performance Considerations:**

| Concern | Solution |
|---------|----------|
| CSS file size | Single globals.css (~15KB gzipped) |
| Token lookup | CSS custom properties = native browser perf |
| Tenant branding | Runtime injection, no additional requests |
| Theme switching | Instant via data-panel attribute |
| Font loading | Preload Inter + Cairo, lazy load tenant fonts |

**Multi-Tenant Isolation:**

| Layer | Isolation Method |
|-------|------------------|
| CSS tokens | Scoped via data-brand attribute |
| Component styling | No global state, pure CSS cascade |
| Font loading | Per-tenant lazy loading |
| Logo/assets | CDN with tenant prefix |

---

## Appendix A: Token Quick Reference

### Color Tokens

| Token | Light Panel | Dark Panel (System) |
|-------|-------------|---------------------|
| `--color-bg` | #F8FAFC | #0D0D0D |
| `--color-surface` | #FFFFFF | #1A1A1A |
| `--color-surface-hover` | #F1F5F9 | #262626 |
| `--color-border` | #E2E8F0 | #333333 |
| `--color-text` | #0F172A | #F9FAFB |
| `--color-text-secondary` | #475569 | #9CA3AF |
| `--color-text-muted` | #94A3B8 | #6B7280 |
| `--color-accent` | Panel-specific | Panel-specific |

### Panel Accents

| Panel | Accent | Accent Hover |
|-------|--------|--------------|
| System | #8B5CF6 (Purple) | #7C3AED |
| Tenant | #2563EB (Blue) | #1E40AF |
| App | #14B8A6 (Teal) | #0D9488 |

### Component Token Bindings

| Component | Background | Text | Border |
|-----------|------------|------|--------|
| Button Primary | --color-accent | white | --color-accent |
| Button Secondary | --color-surface | --color-text | --color-border |
| Input | --color-surface | --color-text | --color-border |
| Card | --color-surface | --color-text | --color-border |
| Table Header | --color-surface-alt | --color-text | --color-border |

---

## Appendix B: Files to Migrate

### Wave 1 Files (14)
1. client/src/layouts/AuthLayout.tsx
2. client/src/pages/auth/LoginPage.tsx
3. client/src/pages/tenants/CreateTenantPage.tsx
4. client/src/pages/tenants/EditTenantPage.tsx
5. client/src/pages/tenants/TenantsListPage.tsx
6. client/src/pages/tenants/TenantDetailPage.tsx
7. client/src/pages/dashboard/DashboardHomePage.tsx
8. client/src/pages/Dashboard.tsx

### Wave 2 Files (10)
1. client/src/pages/system/SystemUsersListPage.tsx
2. client/src/pages/system/SystemTenantsListPage.tsx
3. client/src/pages/system/SystemCreateUserPage.tsx
4. client/src/pages/system/SystemRolesPage.tsx
5. client/src/pages/system/SystemDPFPage.tsx
6. client/src/pages/business-lines/BusinessLinesListPage.tsx
7. client/src/pages/business-lines/CreateBusinessLinePage.tsx
8. client/src/pages/branches/BranchesListPage.tsx
9. client/src/pages/branches/CreateBranchPage.tsx

### Wave 3 Files (10)
1. client/src/pages/users/UsersListPage.tsx
2. client/src/pages/users/CreateUserPage.tsx
3. client/src/pages/roles/RolesPage.tsx
4. client/src/pages/app/AppDashboard.tsx
5. client/src/pages/app/AppPatientsPage.tsx
6. client/src/pages/app/AppAppointmentsPage.tsx
7. client/src/pages/app/AppTasksPage.tsx
8. client/src/pages/app/AppReportsPage.tsx
9. client/src/pages/admin/AdminSettingsPage.tsx
10. client/src/pages/not-found/NotFoundPage.tsx

---

**Document Status:** ARCHITECTURE COMPLETE  
**Next Step:** Await approval to begin implementation  
**Estimated Duration:** 5 weeks (25 working days)

---

*This document serves as the definitive architectural blueprint for Phase 6 UX Normalization. No code has been written - this is purely design and planning documentation.*
