import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion compound components must be used within Accordion');
  }
  return context;
}

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  value?: string[];  // Controlled value
  onValueChange?: (value: string[]) => void;  // Controlled onChange
}

export function Accordion({
  type = 'single',
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
  ...props
}: AccordionProps) {
  const [internalOpenItems, setInternalOpenItems] = React.useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  // Use controlled or uncontrolled value
  const openItems = controlledValue !== undefined ? controlledValue : internalOpenItems;
  const setOpenItems = onValueChange || setInternalOpenItems;

  const toggleItem = (itemValue: string) => {
    if (type === 'single') {
      setOpenItems(openItems.includes(itemValue) ? [] : [itemValue]);
    } else {
      setOpenItems(
        openItems.includes(itemValue)
          ? openItems.filter((item) => item !== itemValue)
          : [...openItems, itemValue]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | undefined>(undefined);

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, style, value, children, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        ref={ref}
        className={cn('border-b', className)}
        style={{
          borderColor: 'var(--color-border)',
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
);
AccordionItem.displayName = 'AccordionItem';

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;  // Optional - will use AccordionItem context if not provided
}

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, value: propValue, style, ...props }, ref) => {
    const { openItems, toggleItem } = useAccordion();
    const itemContext = React.useContext(AccordionItemContext);
    const value = propValue || itemContext?.value || '';
    const isOpen = openItems.includes(value);

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex w-full items-center justify-between py-4 font-medium transition-all',
          'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          className
        )}
        style={{
          ...style
        }}
        data-state={isOpen ? 'open' : 'closed'}
        onClick={() => toggleItem(value)}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </button>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;  // Optional - will use AccordionItem context if not provided
}

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, value: propValue, style, ...props }, ref) => {
    const { openItems } = useAccordion();
    const itemContext = React.useContext(AccordionItemContext);
    const value = propValue || itemContext?.value || '';
    const isOpen = openItems.includes(value);

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn('pb-4 pt-0 animate-in slide-in-from-top-1', className)}
        style={{
          color: 'var(--color-text-secondary)',
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AccordionContent.displayName = 'AccordionContent';
