import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', style, ...props }, ref) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'success':
          return {
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--color-success)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
          };
        case 'warning':
          return {
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--color-warning)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
          };
        case 'error':
          return {
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--color-danger)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          };
        case 'info':
          return {
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--color-info)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
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

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
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
