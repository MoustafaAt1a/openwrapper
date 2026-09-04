export type DisplayPaymentStatus = "pending" | "succeeded" | "failed" | "unknown"

export function normalizePaymentStatus(
  status: string,
  hasNextAction: boolean,
): DisplayPaymentStatus {
  if (status === "succeeded" || status === "failed") return status
  if (status === "pending" || (status === "unknown" && hasNextAction)) return "pending"
  return "unknown"
}

export function paymentHasNextAction(row: {
  nextActionType?: string | null
  nextActionPayload?: string | null
}): boolean {
  return Boolean(row.nextActionType || row.nextActionPayload)
}
