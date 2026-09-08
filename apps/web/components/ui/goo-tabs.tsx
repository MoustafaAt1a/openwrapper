"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────
 * Core hook: tracks a DOM element's offset position
 * relative to its container, re-measures on resize.
 * ───────────────────────────────────────────────────── */
export function useSlidingIndicator<K extends string>(activeId: K) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<K, HTMLElement>>(new Map())
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 })

  const update = useCallback(() => {
    const el = itemRefs.current.get(activeId)
    if (!el) return
    setStyle({
      width: el.offsetWidth,
      height: el.offsetHeight,
      top: el.offsetTop,
      left: el.offsetLeft,
      opacity: 1,
      transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
    })
  }, [activeId])

  useEffect(() => {
    update()
  }, [update])

  useEffect(() => {
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [update])

  const setRef = useCallback(
    (id: K) => (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(id, el)
      else itemRefs.current.delete(id)
    },
    [],
  )

  return { containerRef, indicatorStyle: style, setRef }
}

/* ─────────────────────────────────────────────────────
 * GooTabs — inline pill tab bar with sliding indicator
 * ───────────────────────────────────────────────────── */
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
  const { containerRef, indicatorStyle, setRef } = useSlidingIndicator(activeId)

  const sizeClasses = size === "sm"
    ? "text-[11px] px-2.5 py-1"
    : "text-xs px-3 py-1.5"

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center rounded-full p-1",
        className,
      )}
    >
      {/* Sliding indicator pill */}
      <div
        className={cn("absolute rounded-full", indicatorClassName)}
        style={indicatorStyle}
        aria-hidden="true"
      />

      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            ref={setRef(item.id) as React.Ref<HTMLButtonElement>}
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

/* ─────────────────────────────────────────────────────
 * SlidingCardSelector — grid card selector with
 * sliding border/bg indicator behind the active card
 * ───────────────────────────────────────────────────── */
interface SlidingCardItem {
  id: string
  content: React.ReactNode
}

interface SlidingCardSelectorProps {
  items: SlidingCardItem[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
  indicatorClassName?: string
  cardClassName?: string
  activeCardClassName?: string
}

export function SlidingCardSelector({
  items,
  activeId,
  onSelect,
  className,
  indicatorClassName,
  cardClassName,
  activeCardClassName,
}: SlidingCardSelectorProps) {
  const { containerRef, indicatorStyle, setRef } = useSlidingIndicator(activeId)

  return (
    <div
      ref={containerRef}
      className={cn("relative grid", className)}
    >
      {/* Sliding border indicator */}
      <div
        className={cn(
          "absolute rounded-xl border-2 border-primary bg-primary/8 ring-1 ring-primary/30 pointer-events-none",
          indicatorClassName,
        )}
        style={indicatorStyle}
        aria-hidden="true"
      />

      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            ref={setRef(item.id) as React.Ref<HTMLButtonElement>}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.id)}
            className={cn(
              "relative z-10 rounded-xl border border-transparent text-left transition-colors duration-200 cursor-pointer",
              isActive
                ? cn("border-transparent", activeCardClassName)
                : cn("border-border bg-secondary/50 hover:bg-secondary hover:border-border", cardClassName),
            )}
          >
            {item.content}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
 * SlidingNavIndicator — navigation bar with a sliding
 * background pill that follows the active link
 * ───────────────────────────────────────────────────── */
interface SlidingNavItem {
  id: string
  href: string
  label: string
}

interface SlidingNavIndicatorProps {
  items: SlidingNavItem[]
  activeId: string
  onLinkClick?: (e: React.MouseEvent<HTMLAnchorElement>, item: SlidingNavItem) => void
  className?: string
  indicatorClassName?: string
  linkClassName?: string
  activeLinkClassName?: string
  LinkComponent?: React.ComponentType<{
    href: string
    onClick?: React.MouseEventHandler<HTMLAnchorElement>
    className?: string
    children?: React.ReactNode
    ref?: React.Ref<HTMLAnchorElement>
  }>
}

export function SlidingNavIndicator({
  items,
  activeId,
  onLinkClick,
  className,
  indicatorClassName,
  linkClassName,
  activeLinkClassName,
  LinkComponent = "a" as unknown as SlidingNavIndicatorProps["LinkComponent"],
}: SlidingNavIndicatorProps) {
  const { containerRef, indicatorStyle, setRef } = useSlidingIndicator(activeId)
  const Comp = LinkComponent!

  return (
    <nav
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn("relative flex items-center gap-1 lg:gap-1.5", className)}
      aria-label="Main navigation"
    >
      {/* Sliding background pill */}
      {activeId && (
        <div
          className={cn(
            "absolute rounded-full bg-primary/10",
            indicatorClassName,
          )}
          style={indicatorStyle}
          aria-hidden="true"
        />
      )}

      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <Comp
            key={item.id}
            ref={setRef(item.id) as React.Ref<HTMLAnchorElement>}
            href={item.href}
            onClick={onLinkClick ? (e: React.MouseEvent<HTMLAnchorElement>) => onLinkClick(e, item) : undefined}
            className={cn(
              "relative z-10 px-3 py-1.5 rounded-full text-[13.5px] transition-colors duration-200 whitespace-nowrap",
              isActive
                ? cn("text-foreground font-medium", activeLinkClassName)
                : cn("text-muted-foreground hover:text-foreground", linkClassName),
            )}
          >
            {item.label}
          </Comp>
        )
      })}
    </nav>
  )
}
