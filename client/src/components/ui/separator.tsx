import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  variant?: 'default' | 'muted' | 'accent';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, variant = 'default', style, ...props }, ref) => {
    const getVariantColor = () => {
      switch (variant) {
        case 'muted':
          return 'var(--color-surface-hover)';
        case 'accent':
          return 'var(--color-accent)';
        default:
          return 'var(--color-border)';
      }
    };

    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={orientation}
        className={cn(
          'shrink-0',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        style={{
          backgroundColor: getVariantColor(),
          ...style
        }}
        {...props}
      />
    );
  }
);
Separator.displayName = 'Separator';
