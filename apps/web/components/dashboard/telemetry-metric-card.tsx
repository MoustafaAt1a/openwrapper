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
    border: "border-l-emerald-500",
    valueColor: "text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    border: "border-l-primary",
    valueColor: "text-primary",
  },
  blue: {
    border: "border-l-sky-500",
    valueColor: "text-sky-600 dark:text-sky-400",
  },
  orange: {
    border: "border-l-amber-500",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  pink: {
    border: "border-l-destructive",
    valueColor: "text-destructive",
  },
  ruby: {
    border: "border-l-destructive",
    valueColor: "text-destructive",
  },
}

export function TelemetryMetricCard({
  label,
  value,
  hint,
  className,
  color = "violet",
}: MetricCardProps) {
  const accent = ACCENT_CLASSES[color] ?? ACCENT_CLASSES.violet

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15, ease: "easeOut" } }}
      className={cn(
        "group relative overflow-hidden rounded-r-2xl rounded-l-md border-l-2 border-t border-r border-b",
        accent.border,
        "border-border bg-card/90 backdrop-blur-md p-5 stripe-card-shadow-sm transition-all hover:stripe-card-shadow-hover",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-light font-tnum tracking-tight text-foreground font-display",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground font-light leading-relaxed">{hint}</p>
      ) : null}
    </motion.div>
  )
}

export const MetricCard = TelemetryMetricCard
export default TelemetryMetricCard
