import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  hint?: string
  className?: string
}

export function MetricCard({ label, value, hint, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
