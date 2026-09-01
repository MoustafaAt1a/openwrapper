import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { payments, type payments as paymentsTable } from "@/lib/db/schema"

export type { DisplayPaymentStatus } from "@/lib/payment-status"
export { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-status"

type PaymentRow = typeof paymentsTable.$inferSelect

export function paymentToApiResponse(row: PaymentRow, provider?: string) {
  return {
    payment_id: row.id,
    provider: row.provider,
    provider_reference: row.providerReference,
    status: row.status,
    amount_minor_units: row.amountMinorUnits,
    currency: row.currency,
    merchant_reference: row.merchantReference,
    ...(row.nextActionType
      ? {
          next_action:
            row.nextActionType === "redirect_to_url"
              ? { type: "redirect_to_url" as const, url: row.nextActionPayload }
              : {
                  type: "pay_at_reference" as const,
                  reference: row.nextActionPayload,
                  instructions:
                    row.description ||
                    `Pay at any ${(provider || row.provider) === "fawry" ? "Fawry" : "kiosk"} outlet using reference code: ${row.nextActionPayload}`,
                },
        }
      : {}),
  }
}

export async function findIdempotentPayment(
  userId: string,
  idempotencyKey: string
): Promise<{ row?: PaymentRow; crossTenant: boolean }> {
  const [byUser] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.idempotencyKey, idempotencyKey)))
    .limit(1)

  if (byUser) return { row: byUser, crossTenant: false }

  const [global] = await db
    .select()
    .from(payments)
    .where(eq(payments.idempotencyKey, idempotencyKey))
    .limit(1)

  if (!global) return { row: undefined, crossTenant: false }

  if (global.userId && global.userId !== userId) {
    return { row: undefined, crossTenant: true }
  }

  return { row: global, crossTenant: false }
}

export interface PersistPaymentInput {
  id: string
  userId: string
  apiKeyId: number
  idempotencyKey: string
  requestFingerprint: string
  provider: string
  providerReference: string | null
  status: string
  amountMinorUnits: number
  currency: string
  merchantReference: string | null
  description: string
  customerPhone: string
  customerEmail?: string
  customerName?: string
  nextActionType: string | null
  nextActionPayload: string | null
  metadataJson: string
}

/** Upsert web-owned columns onto a gateway-created payment row (shared Postgres). */
export async function persistPaymentRecord(input: PersistPaymentInput): Promise<PaymentRow> {
  const now = new Date()
  const [row] = await db
    .insert(payments)
    .values({
      id: input.id,
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.requestFingerprint,
      provider: input.provider,
      providerReference: input.providerReference,
      status: input.status,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      merchantReference: input.merchantReference,
      description: input.description,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      nextActionType: input.nextActionType,
      nextActionPayload: input.nextActionPayload,
      metadataJson: input.metadataJson,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: payments.id,
      set: {
        userId: input.userId,
        apiKeyId: input.apiKeyId,
        requestFingerprint: input.requestFingerprint,
        providerReference: input.providerReference,
        status: input.status,
        merchantReference: input.merchantReference,
        description: input.description,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        nextActionType: input.nextActionType,
        nextActionPayload: input.nextActionPayload,
        metadataJson: input.metadataJson,
        updatedAt: now,
      },
    })
    .returning()

  if (!row) {
    const [existing] = await db.select().from(payments).where(eq(payments.id, input.id)).limit(1)
    if (!existing) {
      throw new Error("payment persist failed: row missing after upsert")
    }
    return existing
  }

  return row
}
