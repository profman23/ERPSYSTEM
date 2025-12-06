import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        className={cn(
          'h-4 w-4 rounded text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        style={{
          borderColor: 'var(--color-border)',
        }}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';
