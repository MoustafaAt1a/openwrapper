import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { getPaymobConfig, verifyPaymobHmac } from "@/lib/paymob"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const queryHmac = url.searchParams.get("hmac")
  const rawBody = await request.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const hmac = queryHmac || (payload.hmac as string) || request.headers.get("x-paymob-hmac")
  const config = getPaymobConfig()

  if (config && hmac) {
    const isValid = verifyPaymobHmac(payload, hmac, config.hmacSecret)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 })
    }
  }

  const obj = (payload.obj || payload) as Record<string, unknown>
  const transactionId = String(obj.id || "")
  const success = Boolean(obj.success)
  const isPending = Boolean(obj.pending)
  const specialReference = (obj.special_reference as string) || (obj.merchant_order_id as string)

  const status: "pending" | "succeeded" | "failed" = isPending ? "pending" : success ? "succeeded" : "failed"

  // Find payment by provider reference or merchant reference
  let paymentId: string | null = null
  if (specialReference) {
    const [found] = await db
      .select()
      .from(payments)
      .where(eq(payments.merchantReference, specialReference))
      .limit(1)
    if (found) {
      paymentId = found.id

      // Invariant I13: validate state machine transition (terminal states are immutable)
      const isTerminal = found.status === "succeeded" || found.status === "failed"
      const isIllegal = isTerminal && found.status !== status

      if (!isIllegal) {
        await db
          .update(payments)
          .set({
            status,
            providerReference: transactionId || found.providerReference,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, found.id))
      }
    }
  }

  const eventId = `pm_evt_${transactionId || Date.now()}`
  await db
    .insert(webhookEvents)
    .values({
      eventId,
      provider: "paymob",
      paymentId,
      payloadJson: rawBody,
      signature: hmac || undefined,
    })
    .onConflictDoNothing()

  return NextResponse.json({ received: true, status })
}
