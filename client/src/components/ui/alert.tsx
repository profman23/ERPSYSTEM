import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const getVariantStyles = (variant: string) => {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
        color: 'var(--color-success)',
      };
    case 'warning':
      return {
        backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
        color: 'var(--color-warning)',
      };
    case 'error':
      return {
        backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
        color: 'var(--color-danger)',
      };
    case 'info':
      return {
        backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-info) 30%, transparent)',
        color: 'var(--color-info)',
      };
    default:
      return {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      };
  }
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', style, ...props }, ref) => {
    const variantStyles = getVariantStyles(variant);
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn('relative w-full rounded-lg border p-4', className)}
        style={{ ...variantStyles, ...style }}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';
