import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, iconPosition = 'left', style, ...props }, ref) => {
    const inputStyles: React.CSSProperties = {
      backgroundColor: 'var(--input-bg)',
      borderColor: error ? 'var(--input-error-border)' : 'var(--input-border)',
      color: 'var(--input-text)',
      borderRadius: 'var(--radius)',
      ...style
    };

    if (icon) {
      return (
        <div className="relative w-full">
          {iconPosition === 'left' && (
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-md border px-3 py-2 text-sm",
              "ring-offset-2 file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-border-focus)] focus-visible:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200 ease-out",
              iconPosition === 'left' && 'pl-10',
              iconPosition === 'right' && 'pr-10',
              className
            )}
            style={inputStyles}
            ref={ref}
            {...props}
          />
          {iconPosition === 'right' && (
            <div 
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {icon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border px-3 py-2 text-sm",
          "ring-offset-2 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-border-focus)] focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200 ease-out",
          className
        )}
        style={inputStyles}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
