import * as React from "react"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
  }
>(
  (
    { className, orientation = "horizontal", style, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "shrink-0",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      style={{
        backgroundColor: 'var(--color-border)',
        ...style
      }}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
