import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-primary text-white hover:bg-primary-dark',
          variant === 'outline' && 'border border-border bg-surface hover:bg-bg',
          variant === 'ghost' && 'hover:bg-bg',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-9 px-3 text-sm',
          size === 'lg' && 'h-11 px-8 text-lg',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
