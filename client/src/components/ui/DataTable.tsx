/**
 * DataTable Component
 *
 * Unified data table with sorting, selection, pagination, and loading states
 *
 * Usage:
 * <DataTable
 *   data={users}
 *   columns={[
 *     { key: 'name', header: 'Name' },
 *     { key: 'email', header: 'Email' },
 *     { key: 'actions', header: '', render: (row) => <Button>Edit</Button> }
 *   ]}
 *   pagination={{ currentPage: 1, totalPages: 10, onPageChange: setPage }}
 * />
 */

import { ReactNode, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pagination } from './Pagination';
import { EmptyState } from './empty-state';
import { Checkbox } from './checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface Column<T> {
  key: keyof T | string;
  header: string | ReactNode;
  headerAr?: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  // Key accessor
  getRowKey?: (row: T, index: number) => string | number;
  // Pagination
  pagination?: DataTablePagination;
  // Sorting
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  // Selection
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  // Row click
  onRowClick?: (row: T, index: number) => void;
  // States
  loading?: boolean;
  loadingRows?: number;
  emptyMessage?: string;
  emptyMessageAr?: string;
  emptyIcon?: LucideIcon;
  // Styling
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  stickyHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export function DataTable<T>({
  data,
  columns,
  getRowKey = (_, index) => index,
  pagination,
  sortable = false,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  loading = false,
  loadingRows = 5,
  emptyMessage,
  emptyMessageAr,
  emptyIcon,
  className,
  headerClassName,
  rowClassName,
  stickyHeader = false,
  striped = false,
  bordered = true,
  compact = false,
}: DataTableProps<T>) {
  // Language & RTL
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  const resolvedEmptyMessage = emptyMessage ?? t('common.noData');
  const displayEmptyMessage = isRTL && emptyMessageAr ? emptyMessageAr : resolvedEmptyMessage;

  // Selection state
  const selectedKeys = useMemo(
    () => new Set(selectedRows.map((row, i) => getRowKey(row, i))),
    [selectedRows, getRowKey]
  );

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.([...data]);
    }
  }, [isAllSelected, data, onSelectionChange]);

  // Handle select row
  const handleSelectRow = useCallback(
    (row: T, index: number) => {
      const key = getRowKey(row, index);
      const isSelected = selectedKeys.has(key);

      if (isSelected) {
        onSelectionChange?.(
          selectedRows.filter((r, i) => getRowKey(r, i) !== key)
        );
      } else {
        onSelectionChange?.([...selectedRows, row]);
      }
    },
    [selectedKeys, selectedRows, getRowKey, onSelectionChange]
  );

  // Handle sort
  const handleSort = useCallback(
    (column: string) => {
      if (!onSort) return;

      const newDirection =
        sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(column, newDirection);
    },
    [sortColumn, sortDirection, onSort]
  );

  // Get cell value
  const getCellValue = (row: T, column: Column<T>, index: number): ReactNode => {
    if (column.render) {
      return column.render(row, index);
    }

    const value = (row as Record<string, unknown>)[column.key as string];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
    return String(value);
  };

  // Get alignment class
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (!align) return isRTL ? 'text-right' : 'text-left';
    return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-[var(--color-surface-active)] px-4 py-3">
            <div className="flex gap-4">
              {columns.map((col, i) => (
                <div
                  key={i}
                  className="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse"
                  style={{ width: col.width || '100px' }}
                />
              ))}
            </div>
          </div>
          {/* Rows skeleton */}
          {Array.from({ length: loadingRows }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-4 border-t border-[var(--color-border-subtle)]"
            >
              <div className="flex gap-4">
                {columns.map((col, j) => (
                  <div
                    key={j}
                    className="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse"
                    style={{ width: col.width || '100px' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          {/* Header */}
          <table className="w-full">
            <thead className="bg-[var(--color-surface-active)]">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox checked={false} disabled />
                  </th>
                )}
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
                      'text-[var(--color-text-muted)]',
                      getAlignClass(column.align),
                      column.headerClassName
                    )}
                    style={{ width: column.width, minWidth: column.minWidth }}
                  >
                    {isRTL && column.headerAr ? column.headerAr : column.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
          <EmptyState
            title={displayEmptyMessage}
            icon={emptyIcon}
            className="py-12"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'rounded-lg overflow-hidden',
          bordered && 'border border-[var(--color-border)]'
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead
              className={cn(
                'bg-[var(--color-surface-active)]',
                stickyHeader && 'sticky top-0 z-10',
                headerClassName
              )}
            >
              <tr>
                {/* Select all checkbox */}
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={handleSelectAll}
                        className={cn(
                          'h-4 w-4 rounded border transition-colors',
                          'flex items-center justify-center',
                          isAllSelected || isSomeSelected
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                        )}
                      >
                        {isAllSelected && <Check className="h-3 w-3 text-white" />}
                        {isSomeSelected && <Minus className="h-3 w-3 text-white" />}
                      </button>
                    </div>
                  </th>
                )}

                {/* Column headers */}
                {columns.map((column, index) => {
                  const isSortable = sortable && column.sortable !== false;
                  const isSorted = sortColumn === column.key;
                  const displayHeader = isRTL && column.headerAr ? column.headerAr : column.header;

                  return (
                    <th
                      key={index}
                      className={cn(
                        'px-4',
                        compact ? 'py-2' : 'py-3',
                        'text-xs font-semibold uppercase tracking-wider',
                        'text-[var(--color-text-muted)]',
                        getAlignClass(column.align),
                        isSortable && 'cursor-pointer hover:text-[var(--color-text)] transition-colors',
                        column.headerClassName
                      )}
                      style={{ width: column.width, minWidth: column.minWidth }}
                      onClick={isSortable ? () => handleSort(String(column.key)) : undefined}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          column.align === 'center' && 'justify-center',
                          column.align === 'right' && 'justify-end',
                          isRTL && 'flex-row-reverse'
                        )}
                      >
                        <span>{displayHeader}</span>
                        {isSortable && (
                          <span className="shrink-0">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {data.map((row, rowIndex) => {
                const key = getRowKey(row, rowIndex);
                const isSelected = selectedKeys.has(key);
                const rowClassValue =
                  typeof rowClassName === 'function'
                    ? rowClassName(row, rowIndex)
                    : rowClassName;

                return (
                  <tr
                    key={key}
                    className={cn(
                      'transition-colors',
                      striped && rowIndex % 2 === 1 && 'bg-[var(--color-surface-hover)]/50',
                      isSelected && 'bg-[var(--color-primary-alpha-10)]',
                      !isSelected && 'hover:bg-[var(--color-surface-hover)]',
                      onRowClick && 'cursor-pointer',
                      rowClassValue
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {/* Row checkbox */}
                    {selectable && (
                      <td className="w-12 px-4 py-4">
                        <div
                          className="flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSelectRow(row, rowIndex)}
                            className={cn(
                              'h-4 w-4 rounded border transition-colors',
                              'flex items-center justify-center',
                              isSelected
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Row cells */}
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn(
                          'px-4',
                          compact ? 'py-2' : 'py-4',
                          'text-sm text-[var(--color-text)]',
                          getAlignClass(column.align),
                          column.className
                        )}
                        style={{ width: column.width, minWidth: column.minWidth }}
                      >
                        {getCellValue(row, column, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.onPageSizeChange}
            totalItems={pagination.totalItems}
            showPageSize={!!pagination.onPageSizeChange}
            showTotal={pagination.totalItems !== undefined}
          />
        </div>
      )}
    </div>
  );
}

export default DataTable;
