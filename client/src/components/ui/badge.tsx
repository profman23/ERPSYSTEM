import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', style, ...props }, ref) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'success':
          return {
            backgroundColor: 'var(--badge-success-bg)',
            color: 'var(--badge-success-text)',
            borderColor: 'var(--badge-success-border)',
          };
        case 'warning':
          return {
            backgroundColor: 'var(--badge-warning-bg)',
            color: 'var(--badge-warning-text)',
            borderColor: 'var(--badge-warning-border)',
          };
        case 'error':
          return {
            backgroundColor: 'var(--badge-danger-bg)',
            color: 'var(--badge-danger-text)',
            borderColor: 'var(--badge-danger-border)',
          };
        case 'info':
          return {
            backgroundColor: 'var(--badge-info-bg)',
            color: 'var(--badge-info-text)',
            borderColor: 'var(--badge-info-border)',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--color-surface-hover)',
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          };
        default:
          return {
            backgroundColor: 'var(--badge-default-bg)',
            color: 'var(--badge-default-text)',
            borderColor: 'var(--color-border)',
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return 'px-2 py-0.5 text-[10px]';
        case 'lg':
          return 'px-3 py-1 text-sm';
        default:
          return 'px-2.5 py-0.5 text-xs';
      }
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-semibold border transition-colors',
          getSizeStyles(),
          className
        )}
        style={{
          ...getVariantStyles(),
          ...style,
        }}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
