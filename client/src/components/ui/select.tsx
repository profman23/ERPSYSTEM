import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, style, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border px-3 py-2 pr-8 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          style={{
            backgroundColor: style?.backgroundColor || 'var(--color-input-bg, white)',
            borderColor: style?.borderColor || 'var(--color-border)',
            color: style?.color || 'var(--color-text)',
            ...style
          }}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = 'Select';
