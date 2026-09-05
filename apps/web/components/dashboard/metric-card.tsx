"use client"

import { motion } from "motion/react"
import { GeometricShape, type ShapeColor } from "@/components/geometric-shape"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  className?: string
  shape?: number
  color?: ShapeColor
}

export function MetricCard({
  label,
  value,
  hint,
  className,
  shape,
  color = "violet",
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:border-border/90 hover:shadow-xs",
        className,
      )}
    >
      {shape && (
        <div className="pointer-events-none absolute -top-3 -right-3 select-none opacity-[0.08] dark:opacity-[0.14] transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.18]">
          <GeometricShape shape={shape} color={color} size={64} />
        </div>
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </motion.div>
  )
}
