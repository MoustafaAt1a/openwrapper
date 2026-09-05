"use client"

import { type HTMLMotionProps, motion } from "motion/react"
import { GeometricShape, type ShapeColor } from "@/components/geometric-shape"
import { cn } from "@/lib/utils"

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  cornerShape?: number
  cornerShapeColor?: ShapeColor
  cornerShapeSize?: number
  interactive?: boolean
}

export function MotionCard({
  children,
  className,
  cornerShape,
  cornerShapeColor = "violet",
  cornerShapeSize = 64,
  interactive = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={
        interactive ? { y: -4, transition: { duration: 0.2, ease: "easeOut" } } : undefined
      }
      whileTap={interactive ? { scale: 0.995 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-2xs transition-colors hover:border-border hover:shadow-md",
        className,
      )}
      {...props}
    >
      {cornerShape && (
        <div className="pointer-events-none absolute -top-3 -right-3 select-none opacity-[0.07] dark:opacity-[0.12] transition-opacity duration-300 group-hover:opacity-20">
          <GeometricShape shape={cornerShape} color={cornerShapeColor} size={cornerShapeSize} />
        </div>
      )}
      {children}
    </motion.div>
  )
}
