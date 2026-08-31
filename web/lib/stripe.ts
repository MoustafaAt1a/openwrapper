import Stripe from "stripe"

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
  secretKeyOverride?: string
) {
  const key = secretKeyOverride || process.env.STRIPE_SECRET_KEY

  if (!key) {
    // If Stripe secret key is not configured, generate a mock hosted checkout session
    const mockSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`
    return {
      sessionId: mockSessionId,
      url: `https://checkout.stripe.com/c/pay/${mockSessionId}?mock=true`,
      status: "open",
    }
  }

  const client = new Stripe(key, {
    apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    typescript: true,
  })

  const session = await client.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: params.customerEmail,
      success_url: params.successUrl || "https://example.com/payment/success?session_id={CHECKOUT_SESSION_ID}",
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
    { idempotencyKey: params.idempotencyKey }
  )

  return {
    sessionId: session.id,
    url: session.url,
    status: session.status ?? "open",
  }
}
