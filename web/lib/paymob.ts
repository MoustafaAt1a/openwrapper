import { createHmac } from "node:crypto"
import { constantTimeEqHex } from "@/lib/crypto"

export interface PaymobConfig {
  secretKey: string
  publicKey: string
  hmacSecret: string
  integrationIds: string[]
  notificationUrl?: string
  baseUrl?: string
}

export function getPaymobConfig(override?: Partial<PaymobConfig>): PaymobConfig | null {
  const secretKey = override?.secretKey || process.env.PAYMOB_SECRET_KEY
  const publicKey = override?.publicKey || process.env.PAYMOB_PUBLIC_KEY
  const hmacSecret = override?.hmacSecret || process.env.PAYMOB_HMAC_SECRET
  if (!secretKey || !publicKey || !hmacSecret) return null

  const integrationIds =
    override?.integrationIds && override.integrationIds.length > 0
      ? override.integrationIds
      : (process.env.PAYMOB_INTEGRATION_IDS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

  return {
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds,
    notificationUrl: override?.notificationUrl || process.env.PAYMOB_NOTIFICATION_URL,
    baseUrl: override?.baseUrl || process.env.PAYMOB_BASE_URL || "https://accept.paymob.com",
  }
}

export function verifyPaymobHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  hmacSecretOverride?: string,
): boolean {
  const hmacSecret = hmacSecretOverride || process.env.PAYMOB_HMAC_SECRET
  if (!hmacSecret) return false

  const obj = (payload.obj || payload) as Record<string, unknown>
  const fields = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order.id",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ]

  const concatenated = fields
    .map((field) => {
      if (field.includes(".")) {
        const parts = field.split(".")
        let current: unknown = obj
        for (const p of parts) {
          current = (current as Record<string, unknown>)?.[p]
        }
        return current !== undefined && current !== null ? String(current) : ""
      }
      const val = obj[field]
      return val !== undefined && val !== null ? String(val) : ""
    })
    .join("")

  const calculatedHmac = createHmac("sha512", hmacSecret).update(concatenated).digest("hex")
  return constantTimeEqHex(calculatedHmac, receivedHmac)
}
