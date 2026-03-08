/**
 * useRouteBreadcrumbs — Centralized breadcrumb computation based on current route
 *
 * Used by all pages to render breadcrumbs under their title.
 * Replaces the breadcrumb logic that was previously in layouts.
 */

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumbs';

const ROUTE_LABELS: Record<string, { label: string; labelAr?: string }> = {
  // System routes
  '/system/dashboard': { label: 'System Dashboard', labelAr: 'لوحة النظام' },
  '/system/tenants': { label: 'Tenants', labelAr: 'العملاء' },
  '/system/administration/users': { label: 'Platform Users', labelAr: 'مستخدمو النظام' },
  '/system/administration/roles': { label: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات' },
  '/system/dpf': { label: 'DPF Manager', labelAr: 'إدارة DPF' },
  '/system/ai': { label: 'AI Management', labelAr: 'إدارة الذكاء الاصطناعي' },
  '/system/ai/config': { label: 'AI Configuration', labelAr: 'تكوين الذكاء الاصطناعي' },
  '/system/ai/monitoring': { label: 'AI Monitoring', labelAr: 'مراقبة الذكاء الاصطناعي' },
  '/system/ai/logs': { label: 'AI System Logs', labelAr: 'سجلات الذكاء الاصطناعي' },
  '/system/metrics': { label: 'Platform Metrics', labelAr: 'مقاييس النظام' },
  '/system/settings': { label: 'System Settings', labelAr: 'إعدادات النظام' },
  // App routes
  '/app/dashboard': { label: 'Dashboard', labelAr: 'لوحة التحكم' },
  '/app/administration/business-lines': { label: 'Business Lines', labelAr: 'خطوط الأعمال' },
  '/app/administration/branches': { label: 'Branches', labelAr: 'الفروع' },
  '/app/administration/users': { label: 'Users', labelAr: 'المستخدمين' },
  '/app/administration/roles': { label: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات' },
  '/app/administration/settings': { label: 'Settings', labelAr: 'الإعدادات' },
  '/app/administration/setup/tax-codes': { label: 'Tax Codes', labelAr: 'رموز الضريبة' },
  '/app/administration/setup/warehouses': { label: 'Warehouses', labelAr: 'المستودعات' },
  '/app/appointments': { label: 'Appointments', labelAr: 'المواعيد' },
  '/app/patients': { label: 'Patients', labelAr: 'المرضى' },
  '/app/tasks': { label: 'Tasks', labelAr: 'المهام' },
  '/app/reports': { label: 'Reports', labelAr: 'التقارير' },
  '/app/tenants': { label: 'Tenants', labelAr: 'العملاء' },
  '/app/branches': { label: 'Branches', labelAr: 'الفروع' },
  '/app/business-lines': { label: 'Business Lines', labelAr: 'خطوط الأعمال' },
  '/app/users': { label: 'Users', labelAr: 'المستخدمين' },
};

// Sort routes by length descending so longer routes match first
const SORTED_ROUTES = Object.keys(ROUTE_LABELS).sort((a, b) => b.length - a.length);

export function useRouteBreadcrumbs(): { items: BreadcrumbItem[]; homeHref: string } {
  const location = useLocation();

  return useMemo(() => {
    const isSystem = location.pathname.startsWith('/system');
    const homeHref = isSystem ? '/system/dashboard' : '/app/dashboard';
    const items: BreadcrumbItem[] = [];

    // Dashboard pages — no breadcrumbs
    if (location.pathname === homeHref || location.pathname === '/system' || location.pathname === '/app') {
      return { items: [], homeHref };
    }

    // Find matching route
    const matchedRoute = SORTED_ROUTES.find(route => location.pathname.startsWith(route));

    if (!matchedRoute) {
      return { items: [], homeHref };
    }

    const routeInfo = ROUTE_LABELS[matchedRoute];
    const isOnBasePage = location.pathname === matchedRoute;

    items.push({
      label: routeInfo.label,
      labelAr: routeInfo.labelAr,
      href: isOnBasePage ? undefined : matchedRoute,
    });

    // Add sub-page breadcrumbs
    if (!isOnBasePage) {
      const remaining = location.pathname.slice(matchedRoute.length).split('/').filter(Boolean);
      const lastPart = remaining[remaining.length - 1];

      if (lastPart === 'create') {
        items.push({ label: 'Create New', labelAr: 'إنشاء جديد' });
      } else if (lastPart === 'edit') {
        items.push({ label: 'Edit', labelAr: 'تعديل' });
      } else if (lastPart === 'roles') {
        items.push({ label: 'Manage Roles', labelAr: 'إدارة الأدوار' });
      } else if (lastPart === 'permissions') {
        items.push({ label: 'Permissions', labelAr: 'الصلاحيات' });
      } else if (lastPart.match(/^[0-9a-f-]+$/i)) {
        items.push({ label: 'Details', labelAr: 'التفاصيل' });
      }
    }

    return { items, homeHref };
  }, [location.pathname]);
}
