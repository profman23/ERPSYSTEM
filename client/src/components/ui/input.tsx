import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ease-out",
          className
        )}
        style={{
          backgroundColor: style?.backgroundColor || 'var(--color-input-bg, white)',
          borderColor: style?.borderColor || 'var(--color-border)',
          color: style?.color || 'var(--color-text)',
          ...style
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
