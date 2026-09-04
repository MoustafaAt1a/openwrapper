import Stripe from "stripe"

export function getStripeClient(secretKeyOverride?: string): Stripe {
  const key = secretKeyOverride || process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "Stripe credentials missing. Provide X-Stripe-Secret-Key header or configure STRIPE_SECRET_KEY.",
    )
  }
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    typescript: true,
  })
}

let _stripeInstance: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (prop === "webhooks") {
      return new Stripe(process.env.STRIPE_SECRET_KEY || "whsec_bootstrap", {
        apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
        typescript: true,
      }).webhooks
    }
    if (!_stripeInstance) {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) {
        throw new Error("Stripe credentials missing. Configure STRIPE_SECRET_KEY.")
      }
      _stripeInstance = new Stripe(key, {
        apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
        typescript: true,
      })
    }
    return Reflect.get(_stripeInstance, prop)
  },
})

export interface CreateStripePaymentParams {
  amountMinorUnits: number
  currency: string
  description?: string
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
  idempotencyKey: string
  metadata?: Record<string, string>
}

export async function createStripeCheckoutSession(
  params: CreateStripePaymentParams,
  secretKeyOverride?: string,
) {
  const client = getStripeClient(secretKeyOverride)

  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: params.customerEmail,
      success_url:
        params.successUrl || "https://example.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: params.cancelUrl || "https://example.com/payment/cancel",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountMinorUnits,
            product_data: {
              name: params.description || "OpenWrapper Payment",
            },
          },
        },
      ],
      metadata: params.metadata,
    },
    { idempotencyKey: params.idempotencyKey },
  )

  return {
    sessionId: session.id,
    url: session.url,
    status: session.status ?? "open",
  }
}
