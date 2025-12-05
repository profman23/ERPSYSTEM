import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', style, ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'default':
          return {
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--btn-secondary-bg)',
            color: 'var(--btn-secondary-text)',
            borderColor: 'var(--btn-secondary-border)',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            borderColor: 'var(--color-border)',
          };
        case 'ghost':
          return {
            backgroundColor: 'var(--btn-ghost-bg)',
            color: 'var(--btn-ghost-text)',
          };
        case 'destructive':
          return {
            backgroundColor: 'var(--btn-danger-bg)',
            color: 'var(--btn-danger-text)',
          };
        default:
          return {};
      }
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'outline' && 'border',
          variant === 'secondary' && 'border',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-9 px-3 text-sm',
          size === 'lg' && 'h-11 px-8 text-lg',
          size === 'icon' && 'h-10 w-10',
          className
        )}
        style={{
          ...getVariantStyles(),
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
