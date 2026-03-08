/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumb trail with RTL support
 *
 * Usage:
 * <Breadcrumbs
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Users', href: '/users' },
 *     { label: 'John Doe' }
 *   ]}
 * />
 */

import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface BreadcrumbItem {
  label: string;
  labelAr?: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  showHome?: boolean;
  homeHref?: string;
  maxItems?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function Breadcrumbs({
  items,
  separator,
  showHome = true,
  homeHref = '/',
  maxItems = 0,
  className,
}: BreadcrumbsProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  // Default separator based on direction
  const defaultSeparator = isRTL ? (
    <ChevronLeft className="h-4 w-4" />
  ) : (
    <ChevronRight className="h-4 w-4" />
  );

  const actualSeparator = separator ?? defaultSeparator;

  // Process items for display
  let displayItems = items;

  // Add home if needed
  if (showHome) {
    displayItems = [
      {
        label: t('common.welcome', 'Home'),
        href: homeHref,
        icon: <Home className="h-4 w-4" />,
      },
      ...items,
    ];
  }

  // Collapse middle items if maxItems is set
  if (maxItems > 0 && displayItems.length > maxItems) {
    const firstItems = displayItems.slice(0, Math.ceil(maxItems / 2));
    const lastItems = displayItems.slice(
      -(Math.floor(maxItems / 2) + (maxItems % 2 === 0 ? 0 : 1) - 1)
    );

    displayItems = [
      ...firstItems,
      { label: '...', href: undefined },
      ...lastItems,
    ];
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex', className)}>
      <ol
        className={cn(
          'flex items-center gap-1 text-sm'
        )}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0;
          const label = isRTL && item.labelAr ? item.labelAr : item.label;

          return (
            <li
              key={index}
              className="flex items-center gap-1"
            >
              {/* Separator (not for first item) */}
              {!isFirst && (
                <span className="text-[var(--color-text-muted)]">
                  {actualSeparator}
                </span>
              )}

              {/* Breadcrumb item */}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1 transition-colors',
                    'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  )}
                >
                  {item.icon}
                  <span>{label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1',
                    isLast
                      ? 'text-[var(--color-text)] font-medium'
                      : 'text-[var(--color-text-muted)]'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE USAGE HELPER
// ═══════════════════════════════════════════════════════════════
export function useBreadcrumbs(
  items: Array<{ label: string; href?: string; labelAr?: string }>
): BreadcrumbItem[] {
  return items;
}

export default Breadcrumbs;
