/**
 * Skeleton Loading Component
 *
 * Provides placeholder loading states that match the shape of content
 * Better UX than spinners - shows users what content structure to expect
 *
 * Usage:
 * <Skeleton className="h-4 w-[250px]" />
 * <Skeleton variant="text" />
 * <Skeleton variant="circular" className="w-10 h-10" />
 * <Skeleton variant="rectangular" className="w-full h-32" />
 *
 * Pre-built skeletons:
 * <TableSkeleton rows={5} columns={4} />
 * <CardSkeleton />
 * <ListSkeleton items={3} />
 */

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// BASE SKELETON
// ═══════════════════════════════════════════════════════════════
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-surface-hover)]',
        {
          'animate-pulse': animation === 'pulse',
          'animate-shimmer': animation === 'wave',
          'rounded-full': variant === 'circular',
          'rounded-md': variant === 'rectangular',
          'rounded h-4': variant === 'text',
        },
        className
      )}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// TABLE SKELETON
// ═══════════════════════════════════════════════════════════════
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 pb-4 border-b border-[var(--color-border)]">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? '200px' : '150px' }}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4 py-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
                style={{
                  maxWidth: colIndex === 0 ? '200px' : '150px',
                  opacity: 1 - rowIndex * 0.1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARD SKELETON
// ═══════════════════════════════════════════════════════════════
interface CardSkeletonProps {
  showImage?: boolean;
  showAvatar?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({
  showImage = false,
  showAvatar = true,
  lines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'p-6 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]',
        className
      )}
    >
      {/* Image placeholder */}
      {showImage && (
        <Skeleton className="w-full h-40 mb-4 rounded-lg" />
      )}

      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-4">
        {showAvatar && (
          <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIST SKELETON
// ═══════════════════════════════════════════════════════════════
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
}

export function ListSkeleton({
  items = 5,
  showAvatar = true,
  showAction = true,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('divide-y divide-[var(--color-border)]', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-4"
          style={{ opacity: 1 - i * 0.1 }}
        >
          {showAvatar && (
            <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {showAction && (
            <Skeleton className="h-8 w-20 rounded-md" />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM SKELETON
// ═══════════════════════════════════════════════════════════════
interface FormSkeletonProps {
  fields?: number;
  showButton?: boolean;
  className?: string;
}

export function FormSkeleton({
  fields = 4,
  showButton = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      {showButton && (
        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATS SKELETON
// ═══════════════════════════════════════════════════════════════
interface StatsSkeletonProps {
  cards?: number;
  className?: string;
}

export function StatsSkeleton({ cards = 4, className }: StatsSkeletonProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton variant="circular" className="w-8 h-8" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE SKELETON - Full page loading state
// ═══════════════════════════════════════════════════════════════
interface PageSkeletonProps {
  variant?: 'list' | 'table' | 'cards' | 'dashboard';
  className?: string;
}

export function PageSkeleton({ variant = 'list', className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Search/Filter Bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Content based on variant */}
      {variant === 'table' && <TableSkeleton rows={8} columns={5} />}
      {variant === 'list' && <ListSkeleton items={6} />}
      {variant === 'cards' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      )}
      {variant === 'dashboard' && (
        <>
          <StatsSkeleton cards={4} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CardSkeleton showImage lines={4} />
            <CardSkeleton showImage lines={4} />
          </div>
        </>
      )}
    </div>
  );
}

export default Skeleton;
