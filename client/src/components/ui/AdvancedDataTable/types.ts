/**
 * AdvancedDataTable Types
 * Type definitions for the enterprise-grade data table
 */

import { ColumnDef, RowData } from '@tanstack/react-table';
import { LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TABLE PROPS
// ═══════════════════════════════════════════════════════════════

export interface AdvancedDataTableProps<TData extends RowData> {
  // Data
  data: TData[];
  columns: ColumnDef<TData, unknown>[];

  // Identification (for localStorage)
  tableId: string;

  // Virtualization & Sizing
  height?: number;              // Fixed height in pixels
  autoHeight?: boolean;         // Auto-fill available space (use with containerRef)
  minHeight?: number;           // Minimum height when autoHeight is true
  rowHeight?: number;
  headerHeight?: number;
  overscanCount?: number;

  // Features
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableSorting?: boolean;
  enableSelection?: boolean;

  // Selection
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;

  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;

  // Row interaction
  onRowClick?: (row: TData, index: number) => void;
  getRowId?: (row: TData) => string;

  // States
  isLoading?: boolean;
  emptyMessage?: string;

  // Styling
  className?: string;

  // Column constraints
  minColumnWidth?: number;
  maxColumnWidth?: number;
}

// ═══════════════════════════════════════════════════════════════
// COLUMN HEADER PROPS
// ═══════════════════════════════════════════════════════════════

export interface DraggableColumnHeaderProps {
  id: string;
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  enableResize?: boolean;
  enableDrag?: boolean;
  onResize?: (width: number) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// RESIZE HANDLE PROPS
// ═══════════════════════════════════════════════════════════════

export interface ColumnResizeHandleProps {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// ACTION BUTTON PROPS
// ═══════════════════════════════════════════════════════════════

export interface ActionButton {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'destructive' | 'ghost' | 'outline';
  disabled?: boolean;
  hidden?: boolean;
}

export interface ActionButtonGroupProps {
  actions: ActionButton[];
  mobileBreakpoint?: number;
  maxVisibleMobile?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// TABLE ROW PROPS
// ═══════════════════════════════════════════════════════════════

export interface AdvancedDataTableRowProps<TData> {
  row: TData;
  index: number;
  style: React.CSSProperties;
  columns: ColumnDef<TData, unknown>[];
  columnWidths: Record<string, number>;
  columnOrder: string[];
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: (row: TData, index: number) => void;
  enableSelection?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HEADER PROPS
// ═══════════════════════════════════════════════════════════════

export interface AdvancedDataTableHeaderProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  onColumnOrderChange: (order: string[]) => void;
  onColumnWidthChange: (columnId: string, width: number) => void;
  enableColumnReorder?: boolean;
  enableColumnResize?: boolean;
  enableSelection?: boolean;
  allSelected?: boolean;
  someSelected?: boolean;
  onSelectAll?: (selected: boolean) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  height?: number;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

export const TABLE_DEFAULTS = {
  rowHeight: 56,
  headerHeight: 48,
  minColumnWidth: 80,
  maxColumnWidth: 500,
  overscanCount: 5,
  mobileBreakpoint: 768,
  maxVisibleMobile: 2,
} as const;
