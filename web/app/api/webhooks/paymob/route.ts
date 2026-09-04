import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { getPaymobConfig, verifyPaymobHmac } from "@/lib/paymob"
import { readLimitedTextBody } from "@/lib/request-body"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const queryHmac = url.searchParams.get("hmac")
  const body = await readLimitedTextBody(request, 1_000_000)
  if (!body.ok) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 })
  }
  const rawBody = body.text
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const hmac = queryHmac || (payload.hmac as string) || request.headers.get("x-paymob-hmac")
  const config = getPaymobConfig()

  if (!config) {
    return NextResponse.json(
      { error: "Paymob webhook verification is not configured" },
      { status: 503 },
    )
  }
  if (!hmac) {
    return NextResponse.json({ error: "Missing HMAC signature" }, { status: 401 })
  }
  if (!verifyPaymobHmac(payload, hmac, config.hmacSecret)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 })
  }

  const obj = (payload.obj || payload) as Record<string, unknown>
  const transactionId = String(obj.id || "")
  const success = obj.success === true || obj.success === "true"
  const isPending = obj.pending === true || obj.pending === "true"
  const specialReference = String(obj.special_reference || obj.merchant_order_id || "")
  if (transactionId.length > 255 || specialReference.length > 255) {
    return NextResponse.json({ error: "Invalid webhook identifiers" }, { status: 400 })
  }

  const status: "pending" | "succeeded" | "failed" = isPending
    ? "pending"
    : success
      ? "succeeded"
      : "failed"

  let paymentId: string | null = null
  if (specialReference) {
    const [found] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.provider, "paymob"), eq(payments.merchantReference, specialReference)))
      .limit(1)
    if (found) {
      paymentId = found.id

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

  const eventId = `pm_evt_${transactionId || randomUUID()}`
  await db
    .insert(webhookEvents)
    .values({
      eventId,
      provider: "paymob",
      paymentId,
    })
    .onConflictDoNothing()

  return NextResponse.json({ received: true, status })
}
