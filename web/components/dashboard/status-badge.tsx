import { cn } from "@/lib/utils"

export type DisplayPaymentStatus = "pending" | "succeeded" | "failed" | "unknown"

const styles: Record<DisplayPaymentStatus, string> = {
  succeeded: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  unknown: "bg-muted text-muted-foreground border-border",
}

export function StatusBadge({
  status,
  className,
}: {
  status: DisplayPaymentStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
