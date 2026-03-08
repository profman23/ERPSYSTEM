/**
 * AdvancedDataTable Component
 * Enterprise-grade data table with drag-and-drop columns, resizable columns, and virtualization
 */

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowData,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useTablePreferences } from '@/hooks/useTablePreferences';
import { useResponsive } from '@/hooks/useResponsive';
import { DraggableColumnHeader } from './DraggableColumnHeader';
import { AdvancedDataTableProps, TABLE_DEFAULTS } from './types';

export function AdvancedDataTable<TData extends RowData>({
  data,
  columns,
  tableId,
  height: fixedHeight,
  autoHeight = false,
  minHeight = 300,
  rowHeight = TABLE_DEFAULTS.rowHeight,
  headerHeight = TABLE_DEFAULTS.headerHeight,
  overscanCount = TABLE_DEFAULTS.overscanCount,
  enableColumnResize = true,
  enableColumnReorder = true,
  enableSorting = true,
  enableSelection = false,
  selectedIds,
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  getRowId = (row: TData) => (row as { id?: string }).id || '',
  isLoading = false,
  emptyMessage = 'No data available',
  className,
  minColumnWidth = TABLE_DEFAULTS.minColumnWidth,
  maxColumnWidth = TABLE_DEFAULTS.maxColumnWidth,
}: AdvancedDataTableProps<TData>) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();
  const { isRTL } = useLanguage();
  const [containerHeight, setContainerHeight] = useState<number>(fixedHeight || minHeight);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Auto-height calculation + container width tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const calculateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);

        if (autoHeight) {
          const viewportHeight = window.innerHeight;
          const availableHeight = viewportHeight - rect.top - 32;
          setContainerHeight(Math.max(availableHeight, minHeight));
        } else if (fixedHeight) {
          setContainerHeight(fixedHeight);
        }
      }
    };

    calculateDimensions();

    const observer = new ResizeObserver(() => calculateDimensions());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [autoHeight, fixedHeight, minHeight]);

  // Sync horizontal scroll between header and body
  useEffect(() => {
    const bodyEl = bodyScrollRef.current;
    if (!bodyEl) return;

    const handleScroll = () => {
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = bodyEl.scrollLeft;
      }
    };

    bodyEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => bodyEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Use calculated height
  const height = containerHeight;

  // Get column IDs for preferences
  const columnIds = useMemo(
    () => columns.map((col) => (col as { id?: string }).id || ''),
    [columns]
  );

  // Get default column widths
  const defaultColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      const id = (col as { id?: string }).id || '';
      const size = (col as { size?: number }).size || 150;
      widths[id] = size;
    });
    return widths;
  }, [columns]);

  // Table preferences (localStorage)
  const {
    columnOrder,
    columnWidths,
    setColumnOrder,
    setColumnWidth,
  } = useTablePreferences({
    tableId,
    defaultColumnOrder: columnIds,
    defaultColumnWidths,
  });

  // Reorder columns based on saved order
  const orderedColumns = useMemo(() => {
    const columnMap = new Map(
      columns.map((col) => [(col as { id?: string }).id || '', col])
    );
    return columnOrder
      .map((id) => columnMap.get(id))
      .filter(Boolean) as ColumnDef<TData, unknown>[];
  }, [columns, columnOrder]);

  // TanStack Table instance
  const table = useReactTable({
    data,
    columns: orderedColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row as TData),
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);
        const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
        setColumnOrder(newOrder);
      }
    },
    [columnOrder, setColumnOrder]
  );

  // Handle column resize
  const handleColumnResize = useCallback(
    (columnId: string, width: number) => {
      setColumnWidth(columnId, width);
    },
    [setColumnWidth]
  );

  // Handle sort
  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSort) return;

      if (sortColumn === columnId) {
        onSort(columnId, sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        onSort(columnId, 'asc');
      }
    },
    [onSort, sortColumn, sortDirection]
  );

  // Handle selection
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;

      if (checked) {
        const allIds = new Set(data.map((row) => getRowId(row)));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    },
    [data, getRowId, onSelectionChange]
  );

  const handleSelectRow = useCallback(
    (rowId: string, checked: boolean) => {
      if (!onSelectionChange || !selectedIds) return;

      const newIds = new Set(selectedIds);
      if (checked) {
        newIds.add(rowId);
      } else {
        newIds.delete(rowId);
      }
      onSelectionChange(newIds);
    },
    [onSelectionChange, selectedIds]
  );

  // Calculate effective column widths — stretch to fill container
  const effectiveColumnWidths = useMemo(() => {
    if (!containerWidth || columnOrder.length === 0) return columnWidths;

    const checkboxWidth = enableSelection ? 48 : 0;
    let baseColumnsTotal = 0;
    columnOrder.forEach((id) => {
      baseColumnsTotal += columnWidths[id] || 150;
    });

    const availableForColumns = containerWidth - checkboxWidth;
    if (availableForColumns <= baseColumnsTotal || baseColumnsTotal === 0) {
      return columnWidths; // No stretching needed
    }

    const scale = availableForColumns / baseColumnsTotal;
    const scaled: Record<string, number> = {};
    columnOrder.forEach((id) => {
      scaled[id] = Math.floor((columnWidths[id] || 150) * scale);
    });
    return scaled;
  }, [columnWidths, columnOrder, containerWidth, enableSelection]);

  // Calculate total table width
  const totalWidth = useMemo(() => {
    let width = enableSelection ? 48 : 0;
    columnOrder.forEach((id) => {
      width += effectiveColumnWidths[id] || columnWidths[id] || 150;
    });
    return Math.max(width, containerWidth);
  }, [columnOrder, effectiveColumnWidths, columnWidths, enableSelection, containerWidth]);

  // Selection state
  const allSelected = selectedIds?.size === data.length && data.length > 0;
  const someSelected = selectedIds && selectedIds.size > 0 && selectedIds.size < data.length;

  // Row renderer for react-window
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = data[index];
      const rowId = getRowId(row);
      const isSelected = selectedIds?.has(rowId);

      return (
        <div
          style={{ ...style, width: totalWidth }}
          className={cn(
            'flex items-center',
            'border-b border-[var(--color-border)]',
            'hover:bg-[var(--color-surface-hover)] transition-colors',
            isSelected && 'bg-[var(--color-accent-light)]',
            onRowClick && 'cursor-pointer'
          )}
          onClick={() => onRowClick?.(row, index)}
        >
          {/* Selection checkbox */}
          {enableSelection && (
            <div className="w-12 flex-shrink-0 flex items-center justify-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  handleSelectRow(rowId, checked as boolean)
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select row ${index + 1}`}
              />
            </div>
          )}

          {/* Data cells */}
          {orderedColumns.map((column) => {
            const columnId = (column as { id?: string }).id || '';
            const width = effectiveColumnWidths[columnId] || columnWidths[columnId] || 150;
            const cell = table
              .getRowModel()
              .rows[index]?.getVisibleCells()
              .find((c) => c.column.id === columnId);

            return (
              <div
                key={columnId}
                style={{ width, minWidth: width }}
                className="px-3 py-2 truncate text-sm text-[var(--color-text)]"
              >
                {cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null}
              </div>
            );
          })}
        </div>
      );
    },
    [
      data,
      getRowId,
      selectedIds,
      enableSelection,
      orderedColumns,
      effectiveColumnWidths,
      columnWidths,
      totalWidth,
      table,
      onRowClick,
      handleSelectRow,
    ]
  );

  // Disable drag only on mobile devices (small screens) - not all touch devices
  // Desktop touch screens (like Windows laptops) should still have drag enabled
  const effectiveEnableReorder = enableColumnReorder && !isMobile;

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] w-full', className)}
      style={autoHeight ? { height: containerHeight } : undefined}
    >
      {/* Header */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={headerScrollRef}
          className="flex-shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ height: headerHeight }}
        >
          <div
            className="flex items-center h-full"
            style={{ width: totalWidth }}
          >
            {/* Selection checkbox header */}
            {enableSelection && (
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                <Checkbox
                  checked={allSelected || someSelected}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  aria-label="Select all rows"
                />
              </div>
            )}

            {/* Column headers */}
            <SortableContext
              items={columnOrder}
              strategy={horizontalListSortingStrategy}
              disabled={!effectiveEnableReorder}
            >
              {orderedColumns.map((column) => {
                const columnId = (column as { id?: string }).id || '';
                const header = column.header;
                const width = effectiveColumnWidths[columnId] || columnWidths[columnId] || 150;
                const isSortable = enableSorting && (column as { enableSorting?: boolean }).enableSorting !== false;
                const isSorted = sortColumn === columnId;

                return (
                  <DraggableColumnHeader
                    key={columnId}
                    id={columnId}
                    width={width}
                    minWidth={minColumnWidth}
                    maxWidth={maxColumnWidth}
                    enableResize={enableColumnResize}
                    enableDrag={effectiveEnableReorder}
                    onResize={(newWidth) => handleColumnResize(columnId, newWidth)}
                    className="group"
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1 text-sm font-semibold text-[var(--color-text-secondary)]',
                        isSortable && 'cursor-pointer hover:text-[var(--color-text)]'
                      )}
                      onClick={() => isSortable && handleSort(columnId)}
                    >
                      {typeof header === 'function'
                        ? header({} as never)
                        : header}

                      {/* Sort indicator */}
                      {isSorted && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </DraggableColumnHeader>
                );
              })}
            </SortableContext>
          </div>
        </div>
      </DndContext>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-[var(--color-text-muted)]">
            {emptyMessage}
          </div>
        ) : (
          <List
            ref={listRef}
            outerRef={bodyScrollRef}
            height={height - headerHeight}
            itemCount={data.length}
            itemSize={rowHeight}
            overscanCount={overscanCount}
            width={containerWidth || '100%'}
            direction={isRTL ? 'rtl' : 'ltr'}
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}
