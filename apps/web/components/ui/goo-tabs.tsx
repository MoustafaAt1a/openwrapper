"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface GooTabItem {
  id: string
  label: React.ReactNode
}

interface GooTabsProps {
  items: GooTabItem[]
  activeId: string
  onTabChange: (id: string) => void
  className?: string
  indicatorClassName?: string
  tabClassName?: string
  activeTabClassName?: string
  size?: "sm" | "md"
}

/**
 * GooTabs — Morphing metaball tab indicator.
 *
 * Renders a row of tabs with a sliding background pill. The container
 * applies the goo SVG filter so the pill stretches and merges fluidly
 * between positions as you switch tabs.
 */
export function GooTabs({
  items,
  activeId,
  onTabChange,
  className,
  indicatorClassName,
  tabClassName,
  activeTabClassName,
  size = "md",
}: GooTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({})

  const updateIndicator = useCallback(() => {
    const container = containerRef.current
    const activeTab = tabRefs.current.get(activeId)
    if (!container || !activeTab) return

    const containerRect = container.getBoundingClientRect()
    const tabRect = activeTab.getBoundingClientRect()

    setIndicatorStyle({
      width: tabRect.width,
      height: tabRect.height,
      transform: `translateX(${tabRect.left - containerRect.left}px)`,
      transition: "transform 400ms cubic-bezier(0.16, 1, 0.3, 1), width 400ms cubic-bezier(0.16, 1, 0.3, 1)",
    })
  }, [activeId])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    const ro = new ResizeObserver(updateIndicator)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [updateIndicator])

  const sizeClasses = size === "sm"
    ? "text-[11px] px-2 py-1"
    : "text-xs px-3 py-1.5"

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center rounded-full p-1 goo",
        className,
      )}
    >
      {/* Morphing indicator */}
      <div
        className={cn(
          "absolute top-1 left-0 rounded-full",
          indicatorClassName,
        )}
        style={indicatorStyle}
        aria-hidden="true"
      />

      {/* Tab buttons */}
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) tabRefs.current.set(item.id, el)
              else tabRefs.current.delete(item.id)
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative z-10 rounded-full font-medium transition-colors duration-200 whitespace-nowrap cursor-pointer select-none",
              sizeClasses,
              isActive
                ? cn("text-white", activeTabClassName)
                : cn("text-muted-foreground hover:text-foreground", tabClassName),
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
