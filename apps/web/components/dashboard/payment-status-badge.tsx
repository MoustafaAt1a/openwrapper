import { cn } from "@/lib/utils"

export type DisplayPaymentStatus = "pending" | "succeeded" | "failed" | "unknown"

const styles: Record<DisplayPaymentStatus, string> = {
  succeeded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  failed: "bg-[#ea2261]/10 text-[#ea2261] border-[#ea2261]/25",
  pending: "bg-[#ff9f43]/10 text-[#d97706] dark:text-[#ffb048] border-[#ff9f43]/25",
  unknown:
    "bg-[#f6f9fc] dark:bg-white/5 text-[#64748d] dark:text-[#8ca3ba] border-[#e3e8ee] dark:border-white/10",
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
