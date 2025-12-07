import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, label, description, id, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    const checkboxElement = (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          checked={checked}
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border appearance-none cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            className
          )}
          style={{
            borderColor: 'var(--input-border)',
            backgroundColor: checked ? 'var(--color-accent)' : 'var(--input-bg)',
            borderRadius: 'calc(var(--radius) / 2)',
          }}
          onChange={handleChange}
          {...props}
        />
        {checked && (
          <Check 
            className="absolute left-0.5 top-0.5 h-3 w-3 pointer-events-none"
            style={{ color: 'var(--color-text-on-accent)' }}
          />
        )}
      </div>
    );

    if (label || description) {
      return (
        <div className="flex items-start gap-3">
          {checkboxElement}
          <div className="flex flex-col">
            {label && (
              <label 
                htmlFor={checkboxId} 
                className="text-sm font-medium cursor-pointer"
                style={{ color: 'var(--color-text)' }}
              >
                {label}
              </label>
            )}
            {description && (
              <span 
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {description}
              </span>
            )}
          </div>
        </div>
      );
    }

    return checkboxElement;
  }
);
Checkbox.displayName = 'Checkbox';
