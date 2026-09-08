import { NextResponse } from "next/server"
import { validateApiVersion } from "@/lib/api-version"
import { POST as handleFawryWebhook } from "@/app/api/webhooks/fawry/route"
import { POST as handleMockWebhook } from "@/app/api/webhooks/mock/route"
import { POST as handlePaymobWebhook } from "@/app/api/webhooks/paymob/route"
import { POST as handleStripeWebhook } from "@/app/api/webhooks/stripe/route"

export async function POST(
  request: Request,
  context: { params: Promise<{ version: string; provider: string }> },
) {
  const { version: rawVersion, provider } = await context.params
  const versionCheck = validateApiVersion(rawVersion)
  if (!versionCheck.valid) {
    return versionCheck.errorResponse!
  }

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
  if (normalized === "mock") {
    return handleMockWebhook(request)
  }

  return NextResponse.json(
    {
      error: {
        code: "unsupported_provider",
        message: `Webhook provider '${provider}' is not supported. Valid providers: paymob, fawry, stripe, mock.`,
      },
    },
    { status: 400 },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Paymob-HMAC, Stripe-Signature",
      "Access-Control-Max-Age": "86400",
    },
  })
}
