/**
 * Drawer Component (Side Panel)
 *
 * Slide-in panel from left or right with RTL support
 *
 * Usage:
 * <Drawer
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit User"
 * >
 *   <DrawerContent />
 * </Drawer>
 */

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

// ═══════════════════════════════════════════════════════════════
// SIZE MAP
// ═══════════════════════════════════════════════════════════════
const sizeMap = {
  sm: 'max-w-sm',       // 384px
  md: 'max-w-md',       // 448px
  lg: 'max-w-lg',       // 512px
  xl: 'max-w-xl',       // 576px
  full: 'max-w-full',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function Drawer({
  open,
  onClose,
  children,
  title,
  titleAr,
  description,
  descriptionAr,
  position = 'right',
  size = 'md',
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
  contentClassName,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Check RTL
  const isRTL =
    typeof document !== 'undefined' &&
    (document.documentElement.getAttribute('dir') === 'rtl' ||
      document.documentElement.lang === 'ar');

  // Adjust position for RTL
  const actualPosition = isRTL
    ? position === 'right'
      ? 'left'
      : 'right'
    : position;

  // Get display text
  const displayTitle = isRTL && titleAr ? titleAr : title;
  const displayDescription = isRTL && descriptionAr ? descriptionAr : description;

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    // Focus first focusable element
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
        className={cn(
          'absolute top-0 bottom-0 flex flex-col',
          'bg-[var(--color-surface)] shadow-xl',
          'transform transition-transform duration-300 ease-out',
          sizeMap[size],
          size !== 'full' && 'w-full',
          // Position
          actualPosition === 'right' && 'right-0',
          actualPosition === 'left' && 'left-0',
          // Animation
          open
            ? 'translate-x-0'
            : actualPosition === 'right'
              ? 'translate-x-full'
              : '-translate-x-full',
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div
            className={cn(
              'flex items-start gap-4 px-6 py-4 border-b border-[var(--color-border)]'
            )}
          >
            <div className={cn('flex-1')}>
              {displayTitle && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-[var(--color-text)]"
                >
                  {displayTitle}
                </h2>
              )}
              {displayDescription && (
                <p
                  id="drawer-description"
                  className="mt-1 text-sm text-[var(--color-text-muted)]"
                >
                  {displayDescription}
                </p>
              )}
            </div>

            {showClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 shrink-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto px-6 py-4',
            contentClassName
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'px-6 py-4 border-t border-[var(--color-border)]',
              'flex items-center gap-3',
              'justify-end'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRAWER TRIGGER (Optional helper)
// ═══════════════════════════════════════════════════════════════
export interface DrawerTriggerProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

export function DrawerTrigger({
  children,
  onClick,
  className,
}: DrawerTriggerProps) {
  return (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRAWER FOOTER BUTTONS (Optional helper)
// ═══════════════════════════════════════════════════════════════
export interface DrawerFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

export function DrawerFooter({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  loading = false,
  disabled = false,
  variant = 'default',
}: DrawerFooterProps) {
  const isRTL =
    typeof document !== 'undefined' &&
    (document.documentElement.getAttribute('dir') === 'rtl' ||
      document.documentElement.lang === 'ar');

  return (
    <>
      {onCancel && (
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {isRTL ? 'إلغاء' : cancelLabel}
        </Button>
      )}
      {onConfirm && (
        <Button
          variant={variant === 'danger' ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isRTL ? 'جاري...' : 'Loading...'}
            </span>
          ) : (
            isRTL ? 'تأكيد' : confirmLabel
          )}
        </Button>
      )}
    </>
  );
}

export default Drawer;
