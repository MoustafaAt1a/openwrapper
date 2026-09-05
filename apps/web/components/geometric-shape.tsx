"use client"

import { cn } from "@/lib/utils"

export type ShapeColor =
  | "violet"
  | "emerald"
  | "orange"
  | "pink"
  | "blue"
  | "dark"
  | "muted"
  | "current"

const COLOR_CLASSES: Record<ShapeColor, string> = {
  violet: "bg-[#8b5cf6]",
  emerald: "bg-[#34d399]",
  orange: "bg-[#fb923c]",
  pink: "bg-[#ec4899]",
  blue: "bg-[#3b82f6]",
  dark: "bg-[#111111] dark:bg-[#ffffff]",
  muted: "bg-[#6b7280] dark:bg-[#a1a1aa]",
  current: "bg-current",
}

export function GeometricShape({
  shape = 1,
  color = "violet",
  size = 24,
  className,
  style,
}: {
  shape?: number
  color?: ShapeColor
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const shapeNum = Math.min(Math.max(1, shape), 72)
  const shapePath = `/svgs/Shape ${shapeNum}.svg`

  return (
    <span
      className={cn("inline-block shrink-0", COLOR_CLASSES[color], className)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maskImage: `url("${shapePath}")`,
        WebkitMaskImage: `url("${shapePath}")`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        ...style,
      }}
      aria-hidden="true"
    />
  )
}
