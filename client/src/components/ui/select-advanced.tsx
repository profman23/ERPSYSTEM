/**
 * Advanced Select Component
 * Full control over dropdown styling using Radix UI
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// ROOT SELECT
// ═══════════════════════════════════════════════════════════════

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

// ═══════════════════════════════════════════════════════════════
// TRIGGER (The button that opens the dropdown)
// ═══════════════════════════════════════════════════════════════

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean;
  }
>(({ className, children, error, style, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base styles — border class ensures border-width:1px from Tailwind
      'flex h-11 w-full items-center justify-between gap-2 border px-3 py-2 text-sm',
      // Placeholder color
      'data-[placeholder]:text-[var(--select-placeholder)]',
      // Focus state
      'focus:outline-none focus:ring-2 focus:ring-[var(--select-ring)] focus:ring-offset-0',
      // Disabled state
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Transition
      'transition-all duration-200',
      // Error focus ring
      error && 'focus:ring-[var(--select-error-ring)]',
      className
    )}
    style={{
      backgroundColor: 'var(--select-bg)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: error ? 'var(--select-error-border)' : 'var(--select-border)',
      color: 'var(--select-text)',
      borderRadius: 'var(--radius, 0.375rem)',
      ...style,
    }}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--select-icon)' }} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// ═══════════════════════════════════════════════════════════════
// SCROLL BUTTONS (Up/Down arrows for long lists)
// ═══════════════════════════════════════════════════════════════

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      'text-[var(--select-scroll-button)]',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      'text-[var(--select-scroll-button)]',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

// ═══════════════════════════════════════════════════════════════
// CONTENT (The dropdown panel)
// ═══════════════════════════════════════════════════════════════

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      style={{
        backgroundColor: 'var(--select-dropdown-bg)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--select-dropdown-border)',
        borderRadius: 'var(--radius, 0.375rem)',
      }}
      className={cn(
        // Base styles
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden',
        // Shadow
        'shadow-lg shadow-[var(--select-dropdown-shadow)]',
        // Animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        // Position adjustments
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

// ═══════════════════════════════════════════════════════════════
// LABEL (Group label inside dropdown)
// ═══════════════════════════════════════════════════════════════

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold',
      'text-[var(--select-label)]',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

// ═══════════════════════════════════════════════════════════════
// ITEM (Each option in the dropdown)
// ═══════════════════════════════════════════════════════════════

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Base styles
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none',
      // Colors
      'text-[var(--select-item-text)]',
      // Focus/Hover state
      'focus:bg-[var(--select-item-hover-bg)] focus:text-[var(--select-item-hover-text)]',
      // Disabled state
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      // Selected state (highlighted)
      'data-[state=checked]:bg-[var(--select-item-selected-bg)] data-[state=checked]:text-[var(--select-item-selected-text)]',
      // Transition
      'transition-colors duration-150',
      className
    )}
    {...props}
  >
    {/* Checkmark indicator */}
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[var(--select-check)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// ═══════════════════════════════════════════════════════════════
// SEPARATOR (Line between groups)
// ═══════════════════════════════════════════════════════════════

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[var(--select-separator)]', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// ═══════════════════════════════════════════════════════════════
// SIMPLE SELECT (Easy-to-use wrapper)
// ═══════════════════════════════════════════════════════════════

export interface SimpleSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
  error?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

const CLEAR_VALUE = '__clear__';

const SimpleSelect = React.forwardRef<HTMLButtonElement, SimpleSelectProps>(
  (
    {
      value,
      onValueChange,
      placeholder = 'Select...',
      options,
      disabled,
      error,
      className,
      triggerClassName,
      contentClassName,
    },
    ref
  ) => {
    // Radix Select doesn't allow empty string values on items.
    // Map empty values to a sentinel and translate back on change.
    const mappedOptions = options.map((opt) =>
      opt.value === '' ? { ...opt, value: CLEAR_VALUE } : opt
    );
    const selectValue = value === '' ? CLEAR_VALUE : value;

    const handleChange = (v: string) => {
      onValueChange?.(v === CLEAR_VALUE ? '' : v);
    };

    return (
      <div className={className}>
        <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger ref={ref as React.Ref<never>} error={error} className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={contentClassName}>
            {mappedOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);
SimpleSelect.displayName = 'SimpleSelect';

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SimpleSelect,
};
