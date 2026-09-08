"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GripVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GooFabAction {
  id: string
  icon: React.ReactNode
  label: string
  onClick: () => void
  colorClass?: string
}

interface GooFabProps {
  icon: React.ReactNode
  actions: GooFabAction[]
  className?: string
  storageKey?: string
}

const BUTTON_SIZE = 56
const ACTION_SIZE = 44
const DISTANCE = 70
const MARGIN = 16

/**
 * GooFab — Draggable floating action bubble widget with metaball physics
 * and adaptive radial fan-out towards the viewport center.
 */
export function GooFab({
  icon,
  actions,
  className,
  storageKey = "openwrapper_fab_coords_v1",
}: GooFabProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    hasMoved: false,
    activePointerId: -1,
  })

  // Initialize position on client mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const defaultX = window.innerWidth - BUTTON_SIZE - 24
    const defaultY = window.innerHeight - BUTTON_SIZE - 24

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          Number.isFinite(parsed.x) &&
          Number.isFinite(parsed.y)
        ) {
          const clampedX = Math.max(
            MARGIN,
            Math.min(window.innerWidth - BUTTON_SIZE - MARGIN, parsed.x),
          )
          const clampedY = Math.max(
            MARGIN,
            Math.min(window.innerHeight - BUTTON_SIZE - MARGIN, parsed.y),
          )
          setPosition({ x: clampedX, y: clampedY })
          return
        }
      }
    } catch {
      // ignore JSON parse or storage failure
    }

    setPosition({ x: defaultX, y: defaultY })
  }, [storageKey])

  // Handle window resizing to keep widget within viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        return {
          x: Math.max(MARGIN, Math.min(window.innerWidth - BUTTON_SIZE - MARGIN, prev.x)),
          y: Math.max(MARGIN, Math.min(window.innerHeight - BUTTON_SIZE - MARGIN, prev.y)),
        }
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Pointer drag listeners
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position?.x ?? window.innerWidth - BUTTON_SIZE - 24,
      startPosY: position?.y ?? window.innerHeight - BUTTON_SIZE - 24,
      hasMoved: false,
      activePointerId: e.pointerId,
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer capture fallback
    }
  }

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.activePointerId !== e.pointerId) return

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
      setOpen(false) // Close menu while dragging
    }

    if (dragRef.current.hasMoved) {
      const nextX = Math.max(
        MARGIN,
        Math.min(window.innerWidth - BUTTON_SIZE - MARGIN, dragRef.current.startPosX + dx),
      )
      const nextY = Math.max(
        MARGIN,
        Math.min(window.innerHeight - BUTTON_SIZE - MARGIN, dragRef.current.startPosY + dy),
      )
      setPosition({ x: nextX, y: nextY })
    }
  }, [])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (dragRef.current.activePointerId !== e.pointerId) return

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }

      dragRef.current.activePointerId = -1

      if (dragRef.current.hasMoved) {
        setIsDragging(false)
        dragRef.current.hasMoved = false
        // Persist final position
        if (position) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(position))
          } catch {
            // ignore
          }
        }
      } else {
        // Pure click: toggle menu open/close
        setOpen((prev) => !prev)
      }
    },
    [position, storageKey],
  )

  if (!position) return null

  // Compute adaptive fan-out vector pointing towards the center of the viewport
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const widgetCenterX = position.x + BUTTON_SIZE / 2
  const widgetCenterY = position.y + BUTTON_SIZE / 2

  // Center angle pointing into the screen
  const baseAngleRad = Math.atan2(centerY - widgetCenterY, centerX - widgetCenterX)

  // Fan span based on action count
  const actionCount = actions.length
  const totalSpread = Math.min(130, Math.max(70, (actionCount - 1) * 35))
  const spreadRad = (totalSpread * Math.PI) / 180
  const stepRad = actionCount > 1 ? spreadRad / (actionCount - 1) : 0
  const startAngle = baseAngleRad - spreadRad / 2

  return (
    <>
      <div
        className={cn("fixed z-50 select-none touch-none", className)}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transition: isDragging ? "none" : "box-shadow 0.2s ease",
        }}
      >
        <div className="relative goo-light">
          {/* Sub-action buttons expanding in adaptive radial direction */}
          {actions.map((action, i) => {
            const angle = startAngle + i * stepRad
            const x = Math.cos(angle) * DISTANCE
            const y = Math.sin(angle) * DISTANCE

            return (
              <div
                key={action.id}
                className={cn(
                  "absolute flex items-center gap-2 transition-all duration-300 pointer-events-none",
                  open && "pointer-events-auto",
                )}
                style={{
                  left: `${(BUTTON_SIZE - ACTION_SIZE) / 2}px`,
                  top: `${(BUTTON_SIZE - ACTION_SIZE) / 2}px`,
                  transform: open
                    ? `translate(${x}px, ${y}px) scale(1)`
                    : "translate(0, 0) scale(0)",
                  opacity: open ? 1 : 0,
                  transitionDelay: open ? `${i * 35}ms` : "0ms",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    action.onClick()
                    setOpen(false)
                  }}
                  onMouseEnter={() => setHoveredAction(action.id)}
                  onMouseLeave={() => setHoveredAction(null)}
                  title={action.label}
                  aria-label={action.label}
                  className={cn(
                    "flex items-center justify-center size-11 rounded-full shadow-lg transition-all duration-200 cursor-pointer active:scale-95 group",
                    action.colorClass ??
                      "bg-primary text-primary-foreground hover:bg-primary-deep shadow-primary/25",
                  )}
                >
                  {action.icon}
                </button>

                {/* Floating tooltip label when hovered */}
                {hoveredAction === action.id && open && (
                  <span
                    className="absolute z-50 whitespace-nowrap px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-popover text-popover-foreground shadow-md border border-border animate-rise pointer-events-none"
                    style={{
                      left: x >= 0 ? "110%" : "auto",
                      right: x < 0 ? "110%" : "auto",
                    }}
                  >
                    {action.label}
                  </span>
                )}
              </div>
            )
          })}

          {/* Main FAB Draggable Button */}
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-expanded={open}
            aria-label={open ? "Close quick actions menu" : "Open quick actions menu"}
            title="Click to open menu · Drag anywhere to move"
            className={cn(
              "relative z-20 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-200 group ring-4 ring-primary/20",
              isDragging
                ? "cursor-grabbing scale-105 shadow-2xl"
                : "cursor-grab hover:scale-105 active:scale-95",
              open && "bg-primary-deep",
            )}
          >
            {/* Grip Dots Hint for Dragging */}
            <span
              className="absolute -top-1 right-2 text-primary-foreground/40 group-hover:text-primary-foreground/70 transition-colors pointer-events-none"
              title="Draggable"
            >
              <GripVertical className="size-3" />
            </span>

            {/* Icon Morphing */}
            <span
              className={cn(
                "transition-transform duration-300 flex items-center justify-center",
                open ? "rotate-90 scale-110" : "rotate-0 scale-100",
              )}
            >
              {open ? <X className="size-5" /> : icon}
            </span>
          </button>
        </div>
      </div>

      {/* Backdrop to dismiss menu when clicked outside */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/10 backdrop-blur-[0.5px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default GooFab
