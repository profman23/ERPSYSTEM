/**
 * ActionButtonGroup Component
 * Responsive action buttons with dropdown for mobile
 */

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import { ActionButtonGroupProps, ActionButton, TABLE_DEFAULTS } from './types';

export function ActionButtonGroup({
  actions,
  mobileBreakpoint = TABLE_DEFAULTS.mobileBreakpoint,
  maxVisibleMobile = TABLE_DEFAULTS.maxVisibleMobile,
  size = 'md',
  className,
}: ActionButtonGroupProps) {
  const { width } = useResponsive();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter out hidden actions
  const visibleActions = actions.filter((action) => !action.hidden);

  if (visibleActions.length === 0) return null;

  const isMobile = width < mobileBreakpoint;

  // Size classes for buttons
  const sizeClasses = {
    sm: 'h-8 w-8 min-w-8',
    md: 'h-10 w-10 min-w-10',
    lg: 'h-11 w-11 min-w-11',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Desktop & Tablet: Show icon-only buttons
  if (!isMobile) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {visibleActions.map((action) => (
          <ActionButtonIcon
            key={action.id}
            action={action}
            sizeClass={sizeClasses[size]}
            iconSize={iconSizes[size]}
          />
        ))}
      </div>
    );
  }

  // Mobile: Show first N buttons + dropdown for rest
  const primaryActions = visibleActions.slice(0, maxVisibleMobile);
  const overflowActions = visibleActions.slice(maxVisibleMobile);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Primary visible actions */}
      {primaryActions.map((action) => (
        <ActionButtonIcon
          key={action.id}
          action={action}
          sizeClass={sizeClasses.lg} // Larger touch targets on mobile
          iconSize={iconSizes.md}
        />
      ))}

      {/* Overflow dropdown */}
      {overflowActions.length > 0 && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className={cn(sizeClasses.lg, 'rounded-lg')}
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            aria-label="More actions"
          >
            <MoreHorizontal className={iconSizes.md} />
          </Button>

          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Dropdown menu */}
              <div
                className={cn(
                  'absolute right-0 top-full mt-1 z-50',
                  'min-w-[160px] py-1 rounded-lg',
                  'bg-[var(--color-surface)] border border-[var(--color-border)]',
                  'shadow-lg',
                  // RTL support
                  'rtl:right-auto rtl:left-0'
                )}
              >
                {overflowActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      action.onClick(e);
                    }}
                    disabled={action.disabled}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5',
                      'text-sm text-[var(--color-text)]',
                      'hover:bg-[var(--color-surface-hover)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      action.variant === 'destructive' && 'text-[var(--color-danger)]'
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Icon-only button
function ActionButtonIcon({
  action,
  sizeClass,
  iconSize,
}: {
  action: ActionButton;
  sizeClass: string;
  iconSize: string;
}) {
  return (
    <Button
      variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        action.onClick(e);
      }}
      disabled={action.disabled}
      className={cn(
        sizeClass,
        'rounded-lg',
        action.variant === 'destructive'
          ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
      )}
      title={action.label}
      aria-label={action.label}
    >
      <action.icon className={iconSize} />
    </Button>
  );
}
