"use client"

import { cn } from "@/lib/utils"

export interface FilterOption {
  id: string
  label: string
}

interface FilterPillGroupProps {
  options: FilterOption[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function FilterPillGroup({ options, value, onChange, className }: FilterPillGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === opt.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
