import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs');
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export function Tabs({ value, onValueChange, children, className, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'underline' | 'pills';
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant = 'default', style, ...props }, ref) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'underline':
          return {
            backgroundColor: 'transparent',
            borderBottom: '1px solid var(--color-border)',
          };
        case 'pills':
          return {
            backgroundColor: 'transparent',
            gap: '0.5rem',
          };
        default:
          return {
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: 'var(--radius)',
          };
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex h-10 items-center justify-center p-1',
          variant === 'underline' && 'pb-0 gap-4',
          variant === 'pills' && 'p-0',
          className
        )}
        style={{
          ...getVariantStyles(),
          color: 'var(--color-text-secondary)',
          ...style,
        }}
        {...props}
      />
    );
  }
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: 'default' | 'underline' | 'pills';
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, variant = 'default', style, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabs();
    const isSelected = value === selectedValue;

    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case 'underline':
          return {
            backgroundColor: 'transparent',
            color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            borderBottom: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
            borderRadius: '0',
            marginBottom: '-1px',
          };
        case 'pills':
          return {
            backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-surface-hover)',
            color: isSelected ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
            borderRadius: 'var(--radius)',
          };
        default:
          return {
            backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent',
            color: isSelected ? 'var(--color-text)' : 'var(--color-text-secondary)',
            boxShadow: isSelected ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none',
            borderRadius: 'calc(var(--radius) - 2px)',
          };
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium',
          'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        style={{
          ...getVariantStyles(),
          ...style,
        }}
        onClick={() => onValueChange(value)}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = useTabs();
    
    if (value !== selectedValue) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';
