"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  formatValue?: (value: number) => string
  showValue?: boolean
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  formatValue,
  showValue = false,
  className,
  disabled = false,
  "aria-label": ariaLabel,
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div className={cn("w-full flex flex-col gap-2 select-none", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          {label && <label className="text-muted-foreground">{label}</label>}
          {showValue && (
            <span className="font-mono font-semibold text-primary">
              {formatValue ? formatValue(value) : value}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center w-full h-6 group cursor-pointer">
        {/* Background Track */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-secondary border border-border/80 overflow-hidden">
          {/* Active Fill Track */}
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-soft transition-all duration-75 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Real Native Range Input overlay for full accessibility & keyboard support */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel || label || "Slider"}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20",
          )}
        />

        {/* Visual Custom Slider Thumb */}
        <div
          className={cn(
            "absolute pointer-events-none z-10 size-5 -ml-2.5 rounded-full bg-background border-2 border-primary shadow-md ring-2 ring-primary/20",
            "transition-transform duration-100 ease-out group-hover:scale-115 group-active:scale-95",
            disabled && "opacity-50 border-muted-foreground ring-0",
          )}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
