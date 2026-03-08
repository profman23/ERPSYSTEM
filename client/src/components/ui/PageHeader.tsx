/**
 * PageHeader Component
 *
 * Unified page header with breadcrumbs, title, actions, and tabs
 *
 * Usage:
 * <PageHeader
 *   title="Users"
 *   subtitle="Manage system users"
 *   breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]}
 *   actions={<Button>Add User</Button>}
 * />
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { Button } from './button';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface PageTab {
  label: string;
  labelAr?: string;
  value: string;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  backLink?: string;
  backLabel?: string;
  tabs?: PageTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
  sticky?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function PageHeader({
  title,
  titleAr,
  subtitle,
  subtitleAr,
  breadcrumbs,
  actions,
  backLink,
  backLabel,
  tabs,
  activeTab,
  onTabChange,
  className,
  sticky = false,
}: PageHeaderProps) {
  // Check RTL
  const { isRTL } = useLanguage();

  const displayTitle = isRTL && titleAr ? titleAr : title;
  const displaySubtitle = isRTL && subtitleAr ? subtitleAr : subtitle;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      className={cn(
        'space-y-4 pb-4',
        sticky && 'sticky top-0 z-10 bg-[var(--color-background)] pt-4 -mt-4',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} showHome={false} />
      )}

      {/* Title row */}
      <div
        className={cn(
          'flex items-start gap-4'
        )}
      >
        {/* Back button */}
        {backLink && (
          <Link to={backLink}>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              <BackIcon className="h-4 w-4" />
              {backLabel && <span className="ml-1">{backLabel}</span>}
            </Button>
          </Link>
        )}

        {/* Title and subtitle */}
        <div className={cn('flex-1 min-w-0')}>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] truncate">
            {displayTitle}
          </h1>
          {displaySubtitle && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div
            className={cn(
              'flex items-center gap-2 shrink-0'
            )}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div
          className={cn(
            'flex border-b border-[var(--color-border)]'
          )}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const displayLabel = isRTL && tab.labelAr ? tab.labelAr : tab.label;

            return (
              <button
                key={tab.value}
                onClick={() => !tab.disabled && onTabChange?.(tab.value)}
                disabled={tab.disabled}
                className={cn(
                  'relative px-4 py-3 text-sm font-medium transition-colors',
                  'flex items-center gap-2',
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  tab.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {tab.icon}
                <span>{displayLabel}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-full',
                      isActive
                        ? 'bg-[var(--color-primary-alpha-20)] text-[var(--color-primary)]'
                        : 'bg-[var(--color-surface-active)] text-[var(--color-text-muted)]'
                    )}
                  >
                    {tab.count}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <span
                    className={cn(
                      'absolute bottom-0 left-0 right-0 h-0.5',
                      'bg-[var(--color-primary)]'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE PAGE HEADER (Just title and actions)
// ═══════════════════════════════════════════════════════════════
export interface SimplePageHeaderProps {
  title: string;
  titleAr?: string;
  actions?: ReactNode;
  className?: string;
}

export function SimplePageHeader({
  title,
  titleAr,
  actions,
  className,
}: SimplePageHeaderProps) {
  const { isRTL } = useLanguage();

  const displayTitle = isRTL && titleAr ? titleAr : title;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 mb-6',
        className
      )}
    >
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">
        {displayTitle}
      </h1>
      {actions && (
        <div className={cn('flex items-center gap-2')}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE SECTION HEADER (For sections within a page)
// ═══════════════════════════════════════════════════════════════
export interface PageSectionHeaderProps {
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageSectionHeader({
  title,
  titleAr,
  subtitle,
  subtitleAr,
  actions,
  className,
}: PageSectionHeaderProps) {
  const { isRTL } = useLanguage();

  const displayTitle = isRTL && titleAr ? titleAr : title;
  const displaySubtitle = isRTL && subtitleAr ? subtitleAr : subtitle;

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 mb-4',
        className
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {displayTitle}
        </h2>
        {displaySubtitle && (
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {displaySubtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className={cn('flex items-center gap-2')}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
