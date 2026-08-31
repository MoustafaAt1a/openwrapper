import { NextResponse } from "next/server"
import { POST as handleFawryWebhook } from "@/app/api/webhooks/fawry/route"
import { POST as handlePaymobWebhook } from "@/app/api/webhooks/paymob/route"
import { POST as handleStripeWebhook } from "@/app/api/webhooks/stripe/route"

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params
  const normalized = provider.toLowerCase().trim()

  if (normalized === "fawry") {
    return handleFawryWebhook(request)
  }
  if (normalized === "paymob") {
    return handlePaymobWebhook(request)
  }
  if (normalized === "stripe") {
    return handleStripeWebhook(request)
  }

  return NextResponse.json(
    {
      error: {
        code: "unsupported_provider",
        message: `Webhook provider '${provider}' is not supported. Valid providers: paymob, fawry, stripe.`,
      },
    },
    { status: 400 }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Paymob-HMAC, Stripe-Signature",
      "Access-Control-Max-Age": "86400",
    },
  })
}
