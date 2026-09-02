import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { getFawryConfig, verifyFawryWebhookSignature } from "@/lib/fawry"
import { readLimitedTextBody } from "@/lib/request-body"

export async function POST(request: Request) {
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

  const config = getFawryConfig()
  const fawryRefNumber = String(payload.fawryRefNumber || payload.referenceNumber || "")
  const merchantRefNumber = String(payload.merchantRefNumber || payload.merchantRefNum || "")
  const paymentAmount = String(payload.paymentAmount || payload.amount || "")
  const orderAmount = String(payload.orderAmount || paymentAmount || "")
  const orderStatus = String(payload.orderStatus || payload.paymentStatus || "")
  const paymentMethod = String(payload.paymentMethod || "PAYATFAWRY")
  const paymentRefNumber = String(
    payload.paymentRefrenceNumber || payload.paymentReferenceNumber || ""
  )
  const signature = String(payload.messageSignature || payload.signature || "")

  if (fawryRefNumber.length > 255 || merchantRefNumber.length > 255) {
    return NextResponse.json({ error: "Invalid webhook identifiers" }, { status: 400 })
  }

  if (!config) {
    return NextResponse.json(
      { error: "Fawry webhook verification is not configured" },
      { status: 503 }
    )
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 })
  }
  if (
    !verifyFawryWebhookSignature(
      fawryRefNumber,
      merchantRefNumber,
      paymentAmount,
      orderAmount,
      orderStatus,
      paymentMethod,
      paymentRefNumber || undefined,
      config.secureKey,
      signature
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const status: "pending" | "succeeded" | "failed" =
    orderStatus.toUpperCase() === "PAID" || orderStatus.toUpperCase() === "SUCCESS"
      ? "succeeded"
      : orderStatus.toUpperCase() === "UNPAID" || orderStatus.toUpperCase() === "NEW"
      ? "pending"
      : "failed"

  let paymentId: string | null = null
  if (merchantRefNumber || fawryRefNumber) {
    const [found] = await db
      .select()
      .from(payments)
      .where(
        merchantRefNumber
          ? and(eq(payments.provider, "fawry"), eq(payments.merchantReference, merchantRefNumber))
          : and(eq(payments.provider, "fawry"), eq(payments.providerReference, fawryRefNumber))
      )
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
            providerReference: fawryRefNumber || found.providerReference,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, found.id))
      }
    }
  }

  const eventId = `fw_evt_${fawryRefNumber || randomUUID()}`
  await db
    .insert(webhookEvents)
    .values({
      eventId,
      provider: "fawry",
      paymentId,
    })
    .onConflictDoNothing()

  return NextResponse.json({ received: true, status })
}
