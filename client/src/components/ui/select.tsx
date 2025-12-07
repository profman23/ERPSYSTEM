import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string; disabled?: boolean }[];
  error?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, error, placeholder, style, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-border-focus)] focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            className
          )}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? 'var(--input-error-border)' : 'var(--input-border)',
            color: 'var(--input-text)',
            borderRadius: 'var(--radius)',
            ...style
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown 
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" 
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface SelectGroupProps extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {}

export const SelectGroup = React.forwardRef<HTMLOptGroupElement, SelectGroupProps>(
  ({ ...props }, ref) => (
    <optgroup ref={ref} {...props} />
  )
);
SelectGroup.displayName = 'SelectGroup';
