"use client"

import { cn } from "@/lib/utils"

type GooLoaderVariant = "spinner" | "pulse" | "drop"

interface GooLoaderProps {
  variant?: GooLoaderVariant
  size?: "sm" | "md" | "lg"
  className?: string
  color?: string
}

/**
 * GooLoader — Liquid metaball loading animation.
 *
 * Renders orbiting/pulsing dots inside a goo-filtered container,
 * creating organic merge-and-separate liquid motion.
 */
export function GooLoader({
  variant = "spinner",
  size = "md",
  className,
  color = "bg-primary",
}: GooLoaderProps) {
  const sizeMap = { sm: 32, md: 48, lg: 64 }
  const dotSizeMap = { sm: "size-2", md: "size-3", lg: "size-4" }
  const px = sizeMap[size]

  if (variant === "pulse") {
    return (
      <div
        className={cn("relative inline-flex items-center justify-center goo-light", className)}
        style={{ width: px, height: px }}
        role="status"
        aria-label="Loading"
      >
        <div
          className={cn(
            "absolute rounded-full animate-[goo-pulse_1.6s_ease-in-out_infinite]",
            color,
            dotSizeMap[size],
          )}
        />
        <div
          className={cn(
            "absolute rounded-full animate-[goo-pulse_1.6s_ease-in-out_0.3s_infinite]",
            color,
            dotSizeMap[size],
          )}
          style={{ transform: "translateX(60%)" }}
        />
        <div
          className={cn(
            "absolute rounded-full animate-[goo-pulse_1.6s_ease-in-out_0.6s_infinite]",
            color,
            dotSizeMap[size],
          )}
          style={{ transform: "translateX(-60%)" }}
        />
      </div>
    )
  }

  if (variant === "drop") {
    return (
      <div
        className={cn("relative inline-flex items-end justify-center goo-light", className)}
        style={{ width: px, height: px }}
        role="status"
        aria-label="Loading"
      >
        <div
          className={cn(
            "absolute rounded-full animate-[goo-drop_1.8s_ease-in-out_infinite]",
            color,
            dotSizeMap[size],
          )}
        />
        <div
          className={cn("absolute bottom-0 rounded-full", color)}
          style={{ width: px * 0.6, height: px * 0.25, borderRadius: "50%" }}
        />
      </div>
    )
  }

  // Default: spinner — 3 orbiting dots
  return (
    <div
      className={cn("relative inline-flex items-center justify-center goo", className)}
      style={{ width: px, height: px }}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("absolute rounded-full", color, dotSizeMap[size])}
          style={{
            animation: `goo-orbit 1.4s cubic-bezier(0.5, 0, 0.5, 1) ${i * -0.16}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
