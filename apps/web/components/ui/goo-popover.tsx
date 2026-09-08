"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface GooPopoverProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  align?: "start" | "center" | "end"
}

/**
 * GooPopover — Contextual menu that unrolls from its trigger with metaball physics.
 *
 * Wraps trigger + content in a goo-filtered container so the popover
 * panel appears to grow organically out of the trigger button.
 */
export function GooPopover({
  trigger,
  children,
  className,
  contentClassName,
  align = "end",
}: GooPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <div className="goo-light">
        {/* Trigger */}
        <div
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open) } }}
          role="button"
          tabIndex={0}
          className="cursor-pointer"
        >          {trigger}
        </div>

        {/* Content panel */}
        <div
          className={cn(
            "absolute top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card p-1.5 shadow-lg transition-all duration-300 origin-top",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-75 -translate-y-2 pointer-events-none",
            contentClassName,
          )}
          role="menu"
        >
          {children}
        </div>
      </div>

      {/* Backdrop close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

/**
 * GooPopoverItem — A single item inside a GooPopover menu.
 */
export function GooPopoverItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground/90 hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer text-left",
        className,
      )}
    >
      {children}
    </button>
  )
}
