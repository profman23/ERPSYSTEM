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

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
}

export function Accordion({
  type = 'single',
  defaultValue,
  children,
  className,
  ...props
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  const toggleItem = (value: string) => {
    if (type === 'single') {
      setOpenItems(openItems.includes(value) ? [] : [value]);
    } else {
      setOpenItems(
        openItems.includes(value)
          ? openItems.filter((item) => item !== value)
          : [...openItems, value]
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

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, style, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('border-b', className)} 
      style={{
        borderColor: 'var(--color-border)',
        ...style
      }}
      {...props} 
    />
  )
);
AccordionItem.displayName = 'AccordionItem';

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, value, style, ...props }, ref) => {
    const { openItems, toggleItem } = useAccordion();
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
          color: 'var(--color-text)',
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

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, value, style, ...props }, ref) => {
    const { openItems } = useAccordion();
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
