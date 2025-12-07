import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'success' | 'warning' | 'info' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, style, disabled, children, ...props }, ref) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'default':
          return {
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            borderColor: 'var(--btn-primary-bg)',
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
            borderColor: 'transparent',
          };
        case 'destructive':
          return {
            backgroundColor: 'var(--btn-danger-bg)',
            color: 'var(--btn-danger-text)',
            borderColor: 'var(--btn-danger-bg)',
          };
        case 'success':
          return {
            backgroundColor: 'var(--btn-success-bg)',
            color: 'var(--btn-success-text)',
            borderColor: 'var(--btn-success-bg)',
          };
        case 'warning':
          return {
            backgroundColor: 'var(--btn-warning-bg)',
            color: 'var(--btn-warning-text)',
            borderColor: 'var(--btn-warning-bg)',
          };
        case 'info':
          return {
            backgroundColor: 'var(--btn-info-bg)',
            color: 'var(--btn-info-text)',
            borderColor: 'var(--btn-info-bg)',
          };
        case 'link':
          return {
            backgroundColor: 'transparent',
            color: 'var(--color-accent)',
            borderColor: 'transparent',
          };
        default:
          return {};
      }
    };

    const getHoverStyles = () => {
      const hoverMap: Record<string, string> = {
        default: 'hover:opacity-90',
        secondary: 'hover:opacity-90',
        outline: 'hover:bg-[var(--color-surface-hover)]',
        ghost: 'hover:bg-[var(--btn-ghost-bg-hover)]',
        destructive: 'hover:opacity-90',
        success: 'hover:opacity-90',
        warning: 'hover:opacity-90',
        info: 'hover:opacity-90',
        link: 'hover:underline',
      };
      return hoverMap[variant] || '';
    };

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'border',
          getHoverStyles(),
          size === 'default' && 'h-10 px-4 py-2 text-sm',
          size === 'sm' && 'h-9 px-3 text-sm',
          size === 'lg' && 'h-11 px-8 text-base',
          size === 'xs' && 'h-7 px-2 text-xs',
          size === 'icon' && 'h-10 w-10',
          loading && 'cursor-wait',
          className
        )}
        style={{
          ...getVariantStyles(),
          borderRadius: 'var(--radius)',
          ...style,
        }}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
