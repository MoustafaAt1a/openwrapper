import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { readLimitedTextBody } from "@/lib/request-body"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  let rawBody: string
  try {
    const body = await readLimitedTextBody(request, 1_000_000)
    if (!body.ok) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 })
    }
    rawBody = body.text
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
  }

  if (!rawBody || rawBody.length < 2) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get("stripe-signature")

  if (!secret) {
    return NextResponse.json(
      { error: "Stripe webhook verification is not configured" },
      { status: 503 },
    )
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 401 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 })
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
    console.error("Stripe webhook processing failed:", err)
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 })
  }
}
