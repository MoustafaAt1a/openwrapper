import { cn } from "@/lib/utils"

export type DisplayPaymentStatus = "pending" | "succeeded" | "failed" | "unknown"

const styles: Record<DisplayPaymentStatus, string> = {
  succeeded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  failed: "bg-destructive/10 text-destructive border-destructive/25",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  unknown: "bg-muted text-muted-foreground border-border",
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: DisplayPaymentStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  )
}

export const StatusBadge = PaymentStatusBadge
export default PaymentStatusBadge
