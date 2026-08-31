import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
  }

  if (!rawBody || rawBody.length < 2) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get("stripe-signature")

  // ─── Signature verification ───────────────────────────────────────
  let event: Stripe.Event | null = null

  if (secret && signature) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err) {
      return NextResponse.json(
        { error: `Invalid signature: ${(err as Error).message}` },
        { status: 400 }
      )
    }
  } else {
    // No webhook secret configured — parse raw JSON defensively
    try {
      const parsed = JSON.parse(rawBody)
      // Validate minimum Stripe event structure
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.type !== "string" ||
        !parsed.data ||
        typeof parsed.data !== "object" ||
        !("object" in parsed.data)
      ) {
        return NextResponse.json(
          { error: "Invalid Stripe event structure: missing type or data.object" },
          { status: 400 }
        )
      }
      event = parsed as Stripe.Event
    } catch {
      return NextResponse.json({ error: "Invalid payload JSON" }, { status: 400 })
    }
  }

  if (!event) {
    return NextResponse.json({ error: "Failed to parse Stripe event" }, { status: 400 })
  }

  // ─── Process checkout session events ──────────────────────────────
  try {
    let paymentId: string | null = null

    const checkoutEvents = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ]

    if (checkoutEvents.includes(event.type) && event.data?.object) {
      const session = event.data.object as Stripe.Checkout.Session

      if (session && typeof session === "object" && session.id) {
        const status: "pending" | "succeeded" | "failed" =
          session.payment_status === "paid"
            ? "succeeded"
            : event.type.endsWith("failed") || event.type.endsWith("expired")
            ? "failed"
            : "pending"

        const [found] = await db
          .select()
          .from(payments)
          .where(eq(payments.providerReference, session.id))
          .limit(1)

        if (found) {
          paymentId = found.id

          // Invariant I13: terminal states are immutable
          const isTerminal = found.status === "succeeded" || found.status === "failed"
          const isIllegal = isTerminal && found.status !== status

          if (!isIllegal) {
            await db
              .update(payments)
              .set({ status, updatedAt: new Date() })
              .where(eq(payments.id, found.id))
          }
        }
      }
    }

    // Record webhook event in audit log
    const eventId = event.id || `evt_${Date.now()}`
    await db
      .insert(webhookEvents)
      .values({
        eventId,
        provider: "stripe",
        paymentId,
        receivedAt: new Date(),
      })
      .onConflictDoNothing()

    return NextResponse.json({ received: true, eventId })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Webhook processing error" },
      { status: 400 }
    )
  }
}
