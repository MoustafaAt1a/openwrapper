"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface GooFabAction {
  id: string
  icon: React.ReactNode
  label: string
  onClick: () => void
}

interface GooFabProps {
  icon: React.ReactNode
  actions: GooFabAction[]
  className?: string
}

/**
 * GooFab — Expanding floating action button with metaball physics.
 *
 * A main circular button that, on click, expands child action buttons
 * outward. The goo filter makes sub-buttons appear to grow out of
 * the parent blob before separating into distinct circles.
 */
export function GooFab({ icon, actions, className }: GooFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("fixed bottom-6 right-6 z-40", className)}>
      <div className="relative goo-light">
        {/* Sub-action buttons */}
        {actions.map((action, i) => {
          const angle = -90 - (i * 60) // fan upward from bottom-right
          const rad = (angle * Math.PI) / 180
          const dist = 60
          const x = Math.cos(rad) * dist
          const y = Math.sin(rad) * dist

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                action.onClick()
                setOpen(false)
              }}
              title={action.label}
              aria-label={action.label}
              className={cn(
                "absolute bottom-0 right-0 flex items-center justify-center size-11 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 cursor-pointer",
                open
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-0 pointer-events-none",
              )}
              style={{
                transform: open
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : "translate(0, 0) scale(0)",
                transitionDelay: open ? `${i * 50}ms` : "0ms",
              }}
            >
              {action.icon}
            </button>
          )
        })}

        {/* Main FAB button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close actions" : "Open actions"}
          className="relative z-10 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary-deep active:bg-primary-press transition-all duration-200 cursor-pointer"
        >
          <span
            className={cn(
              "transition-transform duration-300",
              open && "rotate-45",
            )}
          >
            {icon}
          </span>
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
