import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get("stripe-signature")
  const rawBody = await request.text()

  let event: Stripe.Event
  if (secret && signature) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err) {
      return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 })
    }
  } else {
    try {
      event = JSON.parse(rawBody) as Stripe.Event
    } catch {
      return NextResponse.json({ error: "Invalid payload JSON" }, { status: 400 })
    }
  }

  let paymentId: string | null = null

  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ].includes(event.type)
  ) {
    const session = event.data.object as Stripe.Checkout.Session
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

      // Invariant I13: validate state machine transition (terminal states are immutable)
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

  const eventId = `st_evt_${event.id || Date.now()}`
  await db
    .insert(webhookEvents)
    .values({
      eventId,
      provider: "stripe",
      paymentId,
      payloadJson: rawBody,
      signature: signature || undefined,
    })
    .onConflictDoNothing()

  return NextResponse.json({ received: true })
}
