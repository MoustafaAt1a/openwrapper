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
      whileHover={{ y: -2, transition: { duration: 0.15, ease: "easeOut" } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-5 shadow-[0_2px_8px_rgba(0,55,112,0.04)] transition-all hover:border-[#a8c3de] dark:hover:border-white/20 hover:shadow-[0_6px_16px_rgba(0,55,112,0.08)]",
        className,
      )}
    >
      {shape && (
        <div className="pointer-events-none absolute -top-3 -right-3 select-none opacity-[0.07] dark:opacity-[0.14] transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.15]">
          <GeometricShape shape={shape} color={color} size={64} />
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold font-tnum tracking-tight text-[#0d253d] dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-[#64748d] dark:text-[#8ca3ba] font-light">{hint}</p>
      ) : null}
    </motion.div>
  )
}
