/**
 * Pagination Component
 *
 * Full-featured pagination with page size selector and RTL support
 *
 * Usage:
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => setPage(page)}
 * />
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  totalItems?: number;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate page numbers
// ═══════════════════════════════════════════════════════════════
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // If total pages is small, show all
  if (totalPages <= 5 + siblingCount * 2) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = range(1, 3 + siblingCount * 2);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = range(totalPages - (2 + siblingCount * 2), totalPages);
    return [1, 'ellipsis', ...rightRange];
  }

  if (showLeftEllipsis && showRightEllipsis) {
    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
  }

  return range(1, totalPages);
}

// ═══════════════════════════════════════════════════════════════
// SIZE MAP
// ═══════════════════════════════════════════════════════════════
const sizeMap = {
  sm: {
    button: 'h-7 w-7 text-xs',
    icon: 'h-3 w-3',
    text: 'text-xs',
    select: 'h-7 text-xs px-2',
  },
  md: {
    button: 'h-9 w-9 text-sm',
    icon: 'h-4 w-4',
    text: 'text-sm',
    select: 'h-9 text-sm px-3',
  },
  lg: {
    button: 'h-11 w-11 text-base',
    icon: 'h-5 w-5',
    text: 'text-base',
    select: 'h-11 text-base px-4',
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = false,
  showTotal = false,
  totalItems,
  showFirstLast = true,
  siblingCount = 1,
  className,
  size = 'md',
}: PaginationProps) {
  const sizes = sizeMap[size];
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  // Swap icons for RTL
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const FirstIcon = isRTL ? ChevronsRight : ChevronsLeft;
  const LastIcon = isRTL ? ChevronsLeft : ChevronsRight;

  const pageNumbers = generatePageNumbers(currentPage, totalPages, siblingCount);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Calculate showing range
  const startItem = pageSize ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = pageSize
    ? Math.min(currentPage * pageSize, totalItems || 0)
    : 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 flex-wrap',
        isRTL && 'flex-row-reverse',
        className
      )}
    >
      {/* Left side: Page size selector and total info */}
      <div
        className={cn(
          'flex items-center gap-4',
          isRTL && 'flex-row-reverse'
        )}
      >
        {/* Page size selector */}
        {showPageSize && onPageSizeChange && (
          <div
            className={cn(
              'flex items-center gap-2',
              isRTL && 'flex-row-reverse'
            )}
          >
            <span className={cn(sizes.text, 'text-[var(--color-text-muted)]')}>
              {t('pagination.show')}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                sizes.select,
                'rounded-md border border-[var(--color-border)]',
                'bg-[var(--color-surface)] text-[var(--color-text)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
              )}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Total info */}
        {showTotal && totalItems !== undefined && (
          <span className={cn(sizes.text, 'text-[var(--color-text-muted)]')}>
            {t('pagination.showingRange', { start: startItem, end: endItem, total: totalItems })}
          </span>
        )}
      </div>

      {/* Right side: Page numbers */}
      <div
        className={cn(
          'flex items-center gap-1',
          isRTL && 'flex-row-reverse'
        )}
      >
        {/* First page */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
            className={cn(sizes.button, 'p-0')}
            title={t('pagination.firstPage')}
          >
            <FirstIcon className={sizes.icon} />
          </Button>
        )}

        {/* Previous page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={cn(sizes.button, 'p-0')}
          title={t('pagination.previousPage')}
        >
          <PrevIcon className={sizes.icon} />
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className={cn(
                  sizes.button,
                  'flex items-center justify-center text-[var(--color-text-muted)]'
                )}
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Button
              key={page}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                sizes.button,
                'p-0',
                isActive && 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
              )}
            >
              {page}
            </Button>
          );
        })}

        {/* Next page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={cn(sizes.button, 'p-0')}
          title={t('pagination.nextPage')}
        >
          <NextIcon className={sizes.icon} />
        </Button>

        {/* Last page */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className={cn(sizes.button, 'p-0')}
            title={t('pagination.lastPage')}
          >
            <LastIcon className={sizes.icon} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE PAGINATION (Just prev/next)
// ═══════════════════════════════════════════════════════════════
export interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        isRTL && 'flex-row-reverse',
        className
      )}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <PrevIcon className="h-4 w-4" />
        <span className="ml-1">{t('pagination.previous')}</span>
      </Button>

      <span className="text-sm text-[var(--color-text-muted)] px-2">
        {currentPage} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <span className="mr-1">{t('pagination.next')}</span>
        <NextIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default Pagination;
