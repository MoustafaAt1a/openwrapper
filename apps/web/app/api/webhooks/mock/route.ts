import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { readLimitedTextBody } from "@/lib/request-body-reader"

const DEFAULT_MOCK_SECRET = "mock_default_secret_key_for_testing_purposes"

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

  const sigHeader =
    request.headers.get("x-mock-signature") || request.headers.get("x-signature") || ""
  const secret = process.env.OPENWRAPPER_MOCK_HMAC_SECRET || DEFAULT_MOCK_SECRET

  if (sigHeader) {
    const cleanSig = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : sigHeader
    const expectedSig = createHmac("sha256", secret).update(rawBody).digest("hex")

    const expectedBuffer = Buffer.from(expectedSig, "utf-8")
    const actualBuffer = Buffer.from(cleanSig, "utf-8")

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  const eventId = String(payload.event_id || payload.eventId || `mock_evt_${randomUUID()}`)
  const providerRef = String(payload.provider_reference || payload.providerReference || "")
  const merchantRef = String(payload.merchant_reference || payload.merchantReference || "")
  const rawStatus = String(payload.status || "succeeded").toLowerCase()

  const status: "pending" | "succeeded" | "failed" =
    rawStatus === "succeeded" || rawStatus === "success" || rawStatus === "paid"
      ? "succeeded"
      : rawStatus === "pending"
        ? "pending"
        : "failed"

  let paymentId: string | null = null
  if (merchantRef || providerRef) {
    const [found] = await db
      .select()
      .from(payments)
      .where(
        merchantRef
          ? and(eq(payments.provider, "mock"), eq(payments.merchantReference, merchantRef))
          : and(eq(payments.provider, "mock"), eq(payments.providerReference, providerRef)),
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
            providerReference: providerRef || found.providerReference,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, found.id))
      }
    }
  }

  await db
    .insert(webhookEvents)
    .values({
      eventId,
      provider: "mock",
      paymentId,
    })
    .onConflictDoNothing()

  return NextResponse.json({ received: true, provider: "mock", status })
}
