/**
 * Virtualized Table Component
 * Phase 7: Frontend High-Throughput Optimization
 * 
 * Implements react-window for efficient rendering of large data tables.
 * Supports sorting, selection, and sticky headers.
 */

import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width: number | string;
  render?: (value: unknown, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface VirtualizedTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  height: number;
  rowHeight?: number;
  headerHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

interface RowData<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T, index: number) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

const TableRow = memo(function TableRow<T extends { id: string }>({
  data: rowData,
  index,
  style,
}: ListChildComponentProps<RowData<T>>) {
  const { columns, data, onRowClick, selectedIds, onSelectionChange } = rowData;
  const item = data[index];

  if (!item) {
    return (
      <div style={style} className="flex items-center justify-center bg-[var(--sys-surface)]">
        <div className="w-5 h-5 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSelected = selectedIds?.has(item.id);

  const handleClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  }, [onRowClick, item, index]);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (onSelectionChange && selectedIds) {
        const newSelection = new Set(selectedIds);
        if (e.target.checked) {
          newSelection.add(item.id);
        } else {
          newSelection.delete(item.id);
        }
        onSelectionChange(newSelection);
      }
    },
    [onSelectionChange, selectedIds, item.id]
  );

  return (
    <div
      style={style}
      className={`flex items-center border-b border-[var(--sys-border)] transition-colors
        ${isSelected ? 'bg-[var(--sys-primary-surface)]' : 'bg-[var(--sys-surface)]'}
        ${onRowClick ? 'cursor-pointer hover:bg-[var(--sys-surface-hover)]' : ''}
      `}
      onClick={handleClick}
    >
      {onSelectionChange && (
        <div className="w-12 flex items-center justify-center flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 rounded border-[var(--sys-border)] text-[var(--sys-primary)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {columns.map((column) => {
        const value = column.key.toString().includes('.')
          ? column.key.toString().split('.').reduce((obj: any, key) => obj?.[key], item)
          : (item as any)[column.key];

        return (
          <div
            key={column.key.toString()}
            className="px-4 py-2 truncate text-[var(--sys-text-primary)]"
            style={{ width: column.width, flexShrink: 0 }}
          >
            {column.render ? column.render(value, item, index) : String(value ?? '')}
          </div>
        );
      })}
    </div>
  );
}) as <T extends { id: string }>(props: ListChildComponentProps<RowData<T>>) => JSX.Element;

export function VirtualizedTable<T extends { id: string }>({
  columns,
  data,
  height,
  rowHeight = 48,
  headerHeight = 48,
  onRowClick,
  selectedIds,
  onSelectionChange,
  sortKey,
  sortOrder,
  onSort,
  isLoading = false,
  emptyMessage = 'No data to display',
  className = '',
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const listRef = useRef<FixedSizeList>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onSelectionChange) {
        if (e.target.checked) {
          onSelectionChange(new Set(data.map((item) => item.id)));
        } else {
          onSelectionChange(new Set());
        }
      }
    },
    [onSelectionChange, data]
  );

  const handleSort = useCallback(
    (key: string) => {
      if (onSort) {
        onSort(key);
      }
    },
    [onSort]
  );

  // Wrapper to bridge React 19 built-in types with @types/react from react-window
  const RowComponent = useCallback(
    (props: ListChildComponentProps<RowData<T>>) => <TableRow {...props} />,
    []
  );

  const rowData: RowData<T> = {
    columns,
    data,
    onRowClick,
    selectedIds,
    onSelectionChange,
  };

  const allSelected = data.length > 0 && selectedIds?.size === data.length;
  const someSelected = selectedIds && selectedIds.size > 0 && selectedIds.size < data.length;
  const listHeight = height - (stickyHeader ? headerHeight : 0);

  return (
    <div ref={containerRef} className={`border border-[var(--sys-border)] rounded-lg overflow-hidden ${className}`}>
      {stickyHeader && (
        <div
          className="flex items-center bg-[var(--sys-surface-secondary)] border-b border-[var(--sys-border)] font-medium text-[var(--sys-text-secondary)]"
          style={{ height: headerHeight }}
        >
          {onSelectionChange && (
            <div className="w-12 flex items-center justify-center flex-shrink-0">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !!someSelected;
                }}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-[var(--sys-border)] text-[var(--sys-primary)]"
              />
            </div>
          )}
          {columns.map((column) => (
            <div
              key={column.key.toString()}
              className={`px-4 py-3 truncate ${column.sortable ? 'cursor-pointer hover:bg-[var(--sys-surface-hover)]' : ''}`}
              style={{ width: column.width, flexShrink: 0 }}
              onClick={() => column.sortable && handleSort(column.key.toString())}
            >
              <span className="flex items-center gap-1">
                {column.header}
                {column.sortable && sortKey === column.key && (
                  <span className="text-[var(--sys-primary)]">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.length === 0 && !isLoading ? (
        <div
          className="flex items-center justify-center bg-[var(--sys-surface)]"
          style={{ height: listHeight }}
        >
          <p className="text-[var(--sys-text-secondary)]">{emptyMessage}</p>
        </div>
      ) : (
        <FixedSizeList
          ref={listRef}
          height={listHeight}
          width={containerWidth || '100%'}
          itemCount={data.length}
          itemSize={rowHeight}
          itemData={rowData}
          overscanCount={5}
        >
          {RowComponent}
        </FixedSizeList>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-[var(--sys-surface)]">
          <div className="w-6 h-6 border-2 border-[var(--sys-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-[var(--sys-text-secondary)]">Loading...</span>
        </div>
      )}
    </div>
  );
}

export default VirtualizedTable;
