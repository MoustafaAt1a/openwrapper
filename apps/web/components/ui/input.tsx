import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      aria-invalid={error ? "true" : props["aria-invalid"]}
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-destructive text-destructive placeholder:text-destructive/60 focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20"
          : "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-2 aria-invalid:focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
