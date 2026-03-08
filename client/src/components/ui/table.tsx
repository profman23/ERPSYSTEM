import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm',
          variant === 'bordered' && 'border',
          className
        )}
        style={{
          borderColor: variant === 'bordered' ? 'var(--table-row-border)' : undefined,
          borderRadius: 'var(--radius)',
        }}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, style, ...props }, ref) => (
    <thead 
      ref={ref} 
      className={cn('', className)}
      style={{
        backgroundColor: 'var(--table-header-bg)',
        ...style
      }}
      {...props} 
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
);
TableBody.displayName = 'TableBody';

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, style, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t font-medium [&>tr]:last:border-b-0', className)}
      style={{
        backgroundColor: 'var(--table-header-bg)',
        borderColor: 'var(--table-row-border)',
        ...style
      }}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  hoverable?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, hoverable = true, style, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors',
        hoverable && 'hover:bg-[var(--table-row-bg-hover)]',
        selected && 'bg-[var(--table-row-bg-hover)]',
        className
      )}
      style={{
        backgroundColor: selected ? 'var(--table-row-bg-hover)' : 'var(--table-row-bg)',
        ...style
      }}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, style, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-sm font-semibold [&:has([role=checkbox])]:pr-0',
        className
      )}
      style={{
        color: 'var(--table-header-text)',
        ...style
      }}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, style, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-4 py-3 align-middle text-sm [&:has([role=checkbox])]:pr-0', className)}
      style={{
        color: 'var(--table-cell-text)',
        ...style
      }}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, style, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm', className)}
      style={{
        color: 'var(--color-text-muted)',
        ...style
      }}
      {...props}
    />
  )
);
TableCaption.displayName = 'TableCaption';
