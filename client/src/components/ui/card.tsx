import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated' | 'ghost';
  padding?: 'default' | 'compact' | 'none';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'default', style, ...props }, ref) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderColor: 'var(--card-border)',
            boxShadow: 'none',
          };
        case 'elevated':
          return {
            backgroundColor: 'var(--card-bg)',
            borderColor: 'transparent',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
          };
        default:
          return {
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          };
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border transition-colors',
          variant !== 'ghost' && variant !== 'outline' && 'border',
          className
        )}
        style={{
          ...getVariantStyles(),
          borderRadius: 'var(--radius)',
          ...style
        }}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, style, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-heading font-semibold leading-none tracking-tight', className)}
      style={{
        color: 'var(--color-text)',
        ...style
      }}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, style, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm', className)}
      style={{
        color: 'var(--color-text-secondary)',
        ...style
      }}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      style={{
        borderColor: 'var(--color-border)',
        ...style
      }}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
