/**
 * Chart of Accounts — Shared Constants
 *
 * Used by ChartOfAccountsPage, AccountDetailPanel, AccountTreeRow, etc.
 * Single source of truth for account type styling and drawer configuration.
 */

import { Landmark, Wallet, Scale, TrendingUp, TrendingDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// ACCOUNT TYPE BADGE CONFIG
// ═══════════════════════════════════════════════════════════════

export const ACCOUNT_TYPE_BADGE: Record<
  string,
  { variant: 'info' | 'success' | 'warning' | 'error' | 'default'; label: string; labelAr: string }
> = {
  ASSET: { variant: 'info', label: 'Asset', labelAr: 'أصول' },
  LIABILITY: { variant: 'warning', label: 'Liability', labelAr: 'خصوم' },
  EQUITY: { variant: 'success', label: 'Equity', labelAr: 'حقوق ملكية' },
  REVENUE: { variant: 'default', label: 'Revenue', labelAr: 'إيرادات' },
  EXPENSE: { variant: 'error', label: 'Expense', labelAr: 'مصروفات' },
};

// ═══════════════════════════════════════════════════════════════
// DRAWER ITEMS
// ═══════════════════════════════════════════════════════════════

export const DRAWER_ITEMS = [
  { type: 'ASSET', icon: Landmark, label: 'Assets', labelAr: 'أصول', color: '#3b82f6' },
  { type: 'LIABILITY', icon: Wallet, label: 'Liabilities', labelAr: 'خصوم', color: '#f59e0b' },
  { type: 'EQUITY', icon: Scale, label: 'Equity', labelAr: 'حقوق ملكية', color: '#10b981' },
  { type: 'REVENUE', icon: TrendingUp, label: 'Revenue', labelAr: 'إيرادات', color: '#6366f1' },
  { type: 'EXPENSE', icon: TrendingDown, label: 'Expense', labelAr: 'مصروفات', color: '#ef4444' },
] as const;

export type DrawerItem = typeof DRAWER_ITEMS[number];
