import { createHash, randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { authenticateApiRequest, recordApiRequest } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { forwardPaymentToRustGateway, getGatewayUrl } from "@/lib/gateway-bridge"
import {
  findIdempotentPayment,
  paymentToApiResponse,
  persistPaymentRecord,
} from "@/lib/payment-persist"
import { validateProviderCredentials } from "@/lib/provider-credentials"
import { createStripeCheckoutSession } from "@/lib/stripe"

function sanitize(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

const safeStr = z.string().trim().transform(sanitize)

const paymentInputSchema = z.object({
  provider: safeStr.pipe(z.string().toLowerCase()).default("paymob"),
  amount_minor_units: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  currency: safeStr.pipe(z.string().toUpperCase()).default("EGP"),
  customer: z.object({
    phone: safeStr.pipe(z.string().min(3, "Customer phone is required")),
    email: z.string().email().optional(),
    full_name: safeStr.optional(),
    fullName: safeStr.optional(),
  }),
  merchant_reference: safeStr.pipe(z.string().max(255)).optional(),
  merchantReference: safeStr.pipe(z.string().max(255)).optional(),
  description: safeStr.pipe(z.string().max(500)).optional(),
  return_url: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

function computeFingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

function extractApiToken(request: Request): string | undefined {
  return (
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    request.headers.get("x-api-key")?.trim() ||
    undefined
  )
}

export async function POST(request: Request) {
  const startedAt = performance.now()
  try {
    const key = await authenticateApiRequest(request)
    if (!key) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing or invalid API key. Use Authorization: Bearer <key> or X-API-Key.",
          },
        },
        { status: 401 }
      )
    }

    const idempotencyKey =
      request.headers.get("idempotency-key") || request.headers.get("Idempotency-Key")
    if (!idempotencyKey || idempotencyKey.length < 1 || idempotencyKey.length > 200) {
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 400,
        startedAt,
      })
      return NextResponse.json(
        {
          error: {
            code: "invalid_request",
            message: "An Idempotency-Key header (1-200 printable ASCII characters) is required.",
          },
        },
        { status: 400 }
      )
    }

    const rawJson = await request.json().catch(() => null)
    const parsed = paymentInputSchema.safeParse(rawJson)
    if (!parsed.success) {
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 422,
        startedAt,
      })
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Invalid payment request payload",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        },
        { status: 422 }
      )
    }

    const data = parsed.data
    const amountMinorUnits = data.amount_minor_units || data.amount
    if (!amountMinorUnits || amountMinorUnits <= 0) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "amount_minor_units must be a positive integer" } },
        { status: 422 }
      )
    }

    const provider = data.provider
    const merchantRef = data.merchant_reference || data.merchantReference || null
    const description = data.description || "Payment"
    const returnUrl = data.return_url || data.returnUrl || undefined
    const customerName = data.customer.full_name || data.customer.fullName || undefined
    const customerPhone = data.customer.phone
    const customerEmail = data.customer.email || undefined
    const metadata = data.metadata || {}
    const currency = data.currency

    const canonicalPayload = {
      provider,
      amount_minor_units: amountMinorUnits,
      currency,
      customer: { phone: customerPhone, email: customerEmail, full_name: customerName },
      merchant_reference: merchantRef,
      description,
      return_url: returnUrl,
      metadata,
    }
    const fingerprint = computeFingerprint(canonicalPayload)

    const idemLookup = await findIdempotentPayment(key.userId, idempotencyKey)
    if (idemLookup.crossTenant) {
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 409,
        startedAt,
      })
      return NextResponse.json(
        {
          error: {
            code: "idempotency_conflict",
            message: "Idempotency key is already in use by another account.",
          },
        },
        { status: 409 }
      )
    }

    if (idemLookup.row) {
      const existing = idemLookup.row
      if (existing.requestFingerprint !== fingerprint) {
        await recordApiRequest({
          userId: key.userId,
          apiKeyId: key.id,
          method: "POST",
          endpoint: "/api/v1/payments",
          statusCode: 400,
          startedAt,
        })
        return NextResponse.json(
          {
            error: {
              code: "idempotency_conflict",
              message: "Idempotency key was already used with different request parameters.",
            },
          },
          { status: 400 }
        )
      }

      const attached = await persistPaymentRecord({
        id: existing.id,
        userId: key.userId,
        apiKeyId: key.id,
        idempotencyKey,
        requestFingerprint: fingerprint,
        provider: existing.provider,
        providerReference: existing.providerReference,
        status: existing.status,
        amountMinorUnits: existing.amountMinorUnits,
        currency: existing.currency,
        merchantReference: existing.merchantReference,
        description: existing.description || description,
        customerPhone: existing.customerPhone || customerPhone,
        customerEmail: existing.customerEmail || customerEmail,
        customerName: existing.customerName || customerName,
        nextActionType: existing.nextActionType,
        nextActionPayload: existing.nextActionPayload,
        metadataJson: existing.metadataJson || JSON.stringify(metadata),
      })

      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 200,
        startedAt,
      })
      return NextResponse.json(paymentToApiResponse(attached, provider))
    }

    const credCheck = validateProviderCredentials(provider, request.headers, rawJson)
    if (!credCheck.ok) {
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 422,
        startedAt,
      })
      return NextResponse.json(
        { error: { code: "missing_provider_credentials", message: credCheck.message } },
        { status: 422 }
      )
    }

    const token = extractApiToken(request)
    let paymentId = `pay_${randomUUID().replaceAll("-", "").slice(0, 24)}`
    let providerReference: string | null = null
    let status: "pending" | "succeeded" | "failed" | "unknown" = "pending"
    let nextActionType: string | null = null
    let nextActionPayload: string | null = null
    let routingLatencyMs: number | undefined

    if (provider === "paymob" || provider === "fawry") {
      if (!getGatewayUrl()) {
        await recordApiRequest({
          userId: key.userId,
          apiKeyId: key.id,
          method: "POST",
          endpoint: "/api/v1/payments",
          statusCode: 503,
          startedAt,
        })
        return NextResponse.json(
          {
            error: {
              code: "gateway_required",
              message: `Provider "${provider}" requires OPENWRAPPER_GATEWAY_URL. Paymob and Fawry payments are handled by the Rust gateway.`,
            },
          },
          { status: 503 }
        )
      }

      const gatewayResult = await forwardPaymentToRustGateway(
        canonicalPayload,
        idempotencyKey,
        token,
        request.headers
      )
      if (!gatewayResult.ok) {
        await recordApiRequest({
          userId: key.userId,
          apiKeyId: key.id,
          method: "POST",
          endpoint: "/api/v1/payments",
          statusCode: gatewayResult.status,
          startedAt,
          routingLatencyMs: gatewayResult.gatewayLatencyMs || undefined,
        })
        return NextResponse.json(
          { error: { code: gatewayResult.code || "gateway_error", message: gatewayResult.error } },
          { status: gatewayResult.status }
        )
      }

      paymentId = gatewayResult.data.payment_id
      providerReference = gatewayResult.data.provider_reference
      status = gatewayResult.data.status
      routingLatencyMs = gatewayResult.gatewayLatencyMs
      nextActionType = gatewayResult.data.next_action?.type || null
      nextActionPayload =
        gatewayResult.data.next_action?.url || gatewayResult.data.next_action?.reference || null
    } else if (provider === "stripe") {
      const stripeSecretKey =
        request.headers.get("x-stripe-secret-key") || rawJson?.provider_credentials?.stripe_secret_key
      try {
        const result = await createStripeCheckoutSession(
          {
            amountMinorUnits,
            currency,
            description,
            customerEmail,
            successUrl: returnUrl,
            cancelUrl: returnUrl,
            idempotencyKey,
            metadata,
          },
          stripeSecretKey || undefined
        )
        providerReference = result.sessionId
        status = "pending"
        nextActionType = "redirect_to_url"
        nextActionPayload = result.url || ""
      } catch (err) {
        const errMsg = (err as Error).message || "Provider error"
        const isConfigError = errMsg.includes("credentials missing") || errMsg.includes("STRIPE")
        const statusCode = isConfigError ? 422 : 502
        await recordApiRequest({
          userId: key.userId,
          apiKeyId: key.id,
          method: "POST",
          endpoint: "/api/v1/payments",
          statusCode,
          startedAt,
        })
        return NextResponse.json(
          {
            error: {
              code: isConfigError ? "missing_provider_credentials" : "provider_error",
              message: errMsg,
            },
          },
          { status: statusCode }
        )
      }
    } else {
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 422,
        startedAt,
      })
      return NextResponse.json(
        {
          error: {
            code: "unsupported_provider",
            message: `Unsupported provider "${provider}". Supported: paymob, fawry, stripe.`,
          },
        },
        { status: 422 }
      )
    }

    const created = await persistPaymentRecord({
      id: paymentId,
      userId: key.userId,
      apiKeyId: key.id,
      idempotencyKey,
      requestFingerprint: fingerprint,
      provider,
      providerReference,
      status,
      amountMinorUnits,
      currency,
      merchantReference: merchantRef,
      description,
      customerPhone,
      customerEmail,
      customerName,
      nextActionType,
      nextActionPayload,
      metadataJson: JSON.stringify(metadata),
    })

    await recordApiRequest({
      userId: key.userId,
      apiKeyId: key.id,
      method: "POST",
      endpoint: "/api/v1/payments",
      statusCode: 201,
      startedAt,
      routingLatencyMs,
    })

    return NextResponse.json(paymentToApiResponse(created, provider), { status: 201 })
  } catch (err) {
    console.error("[POST /api/v1/payments] unexpected error:", err)
    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred while processing the payment.",
        },
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Missing or invalid API key." } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)))

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, key.userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)

  await recordApiRequest({ userId: key.userId, apiKeyId: key.id, method: "GET", endpoint: "/api/v1/payments", statusCode: 200, startedAt })

  return NextResponse.json({
    data: rows.map((p) => ({
      payment_id: p.id,
      provider: p.provider,
      provider_reference: p.providerReference,
      status: p.status,
      amount_minor_units: p.amountMinorUnits,
      currency: p.currency,
      merchant_reference: p.merchantReference,
      description: p.description,
      customer: { phone: p.customerPhone, email: p.customerEmail, name: p.customerName },
      next_action: p.nextActionType
        ? {
            type: p.nextActionType,
            ...(p.nextActionType === "redirect_to_url" ? { url: p.nextActionPayload } : { reference: p.nextActionPayload }),
          }
        : undefined,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    })),
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, Idempotency-Key",
      "Access-Control-Max-Age": "86400",
    },
  })
}
