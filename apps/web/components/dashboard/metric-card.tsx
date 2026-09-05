"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

export type MetricAccentColor = "emerald" | "violet" | "blue" | "orange" | "pink" | "ruby"

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  className?: string
  color?: MetricAccentColor | string
  shape?: number // maintained for backwards compatibility if callers pass it
}

const ACCENT_CLASSES: Record<string, { border: string; valueColor: string }> = {
  emerald: {
    border: "border-emerald-500",
    valueColor: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    border: "border-[#8c82fc]",
    valueColor: "text-[#533afd] dark:text-[#8c82fc]",
  },
  blue: {
    border: "border-[#00d4ff]",
    valueColor: "text-blue-600 dark:text-[#00d4ff]",
  },
  orange: {
    border: "border-amber-500",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  pink: {
    border: "border-[#ea2261]",
    valueColor: "text-[#ea2261]",
  },
  ruby: {
    border: "border-[#ea2261]",
    valueColor: "text-[#ea2261]",
  },
}

export function MetricCard({ label, value, hint, className, color = "violet" }: MetricCardProps) {
  const accent = ACCENT_CLASSES[color] ?? ACCENT_CLASSES.violet

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15, ease: "easeOut" } }}
      className={cn(
        "group relative overflow-hidden rounded-r-2xl rounded-l-md border-l-2 border-t border-r border-b",
        accent.border,
        "border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#111630]/70 backdrop-blur-md p-5 shadow-[0_2px_10px_rgba(0,55,112,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all hover:shadow-[0_8px_20px_rgba(83,58,253,0.08)]",
        className,
      )}
    >
      <p className="text-xs font-medium text-[#64748d] dark:text-[#8ca3ba]">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-light font-tnum tracking-tight text-[#0d253d] dark:text-white",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
          {hint}
        </p>
      ) : null}
    </motion.div>
  )
}
