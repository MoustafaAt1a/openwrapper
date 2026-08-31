import { createHash, randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { authenticateApiRequest, recordApiRequest } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { createPaymobPayment } from "@/lib/paymob"
import { createFawryPayment } from "@/lib/fawry"
import { createStripeCheckoutSession } from "@/lib/stripe"
import { createMockPayment } from "@/lib/mock-provider"
import { forwardPaymentToRustGateway } from "@/lib/gateway-bridge"

const paymentInputSchema = z.object({
  provider: z.string().trim().toLowerCase().default("paymob"),
  amount_minor_units: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().trim().toUpperCase().default("EGP"),
  customer: z.object({
    phone: z.string().trim().min(3, "Customer phone is required"),
    email: z.string().email().optional(),
    full_name: z.string().trim().optional(),
    fullName: z.string().trim().optional(),
  }),
  merchant_reference: z.string().trim().max(255).optional(),
  merchantReference: z.string().trim().max(255).optional(),
  description: z.string().trim().max(500).optional(),
  return_url: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

function computeFingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

export async function POST(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key. Use Authorization: Bearer <key> or X-API-Key." } },
      { status: 401 }
    )
  }

  const idempotencyKey = request.headers.get("idempotency-key") || request.headers.get("Idempotency-Key")
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
      { error: { code: "invalid_request", message: "An Idempotency-Key header (1-200 printable ASCII characters) is required." } },
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
      { error: { code: "validation_error", message: "Invalid payment request payload", fields: z.flattenError(parsed.error).fieldErrors } },
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
  const currency = data.currency
  const provider = data.provider
  const merchantRef = data.merchant_reference || data.merchantReference || null
  const description = data.description || "Payment"
  const returnUrl = data.return_url || data.returnUrl || undefined
  const customerName = data.customer.full_name || data.customer.fullName || undefined
  const customerPhone = data.customer.phone
  const customerEmail = data.customer.email || undefined
  const metadata = data.metadata || {}

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

  // 1. Check idempotency boundary
  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, key.userId), eq(payments.idempotencyKey, idempotencyKey)))
    .limit(1)

  if (existing) {
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
        { error: { code: "idempotency_conflict", message: "Idempotency key was already used with different request parameters." } },
        { status: 400 }
      )
    }

    // Return cached payment response
    await recordApiRequest({
      userId: key.userId,
      apiKeyId: key.id,
      method: "POST",
      endpoint: "/api/v1/payments",
      statusCode: 200,
      startedAt,
    })

    return NextResponse.json({
      payment_id: existing.id,
      provider: existing.provider,
      provider_reference: existing.providerReference,
      status: existing.status,
      amount_minor_units: existing.amountMinorUnits,
      currency: existing.currency,
      merchant_reference: existing.merchantReference,
      ...(existing.nextActionType
        ? {
            next_action:
              existing.nextActionType === "redirect_to_url"
                ? { type: "redirect_to_url", url: existing.nextActionPayload }
                : { type: "pay_at_reference", reference: existing.nextActionPayload, instructions: existing.description },
          }
        : {}),
    })
  }

  // 2. Try routing to Rust Gateway if configured
  const gatewayResult = await forwardPaymentToRustGateway(
    canonicalPayload,
    idempotencyKey,
    request.headers.get("authorization")?.replace("Bearer ", "") || undefined
  )

  let paymentId = gatewayResult?.payment_id || `pay_${randomUUID().replaceAll("-", "").slice(0, 24)}`
  let providerReference = gatewayResult?.provider_reference || null
  let status: "pending" | "succeeded" | "failed" | "unknown" = gatewayResult?.status || "pending"
  let nextActionType: string | null = gatewayResult?.next_action?.type || null
  let nextActionPayload: string | null = gatewayResult?.next_action?.url || gatewayResult?.next_action?.reference || null

  // Extract optional per-request provider credentials from headers or payload (Option 2: Stateless / Zero Storage)
  const paymobSecretKey = request.headers.get("x-paymob-secret-key") || rawJson?.provider_credentials?.secret_key
  const paymobPublicKey = request.headers.get("x-paymob-public-key") || rawJson?.provider_credentials?.public_key
  const paymobHmacSecret = request.headers.get("x-paymob-hmac-secret") || rawJson?.provider_credentials?.hmac_secret
  const paymobIntegrationId = request.headers.get("x-paymob-integration-id") || rawJson?.provider_credentials?.integration_id

  const fawryMerchantCode = request.headers.get("x-fawry-merchant-code") || rawJson?.provider_credentials?.merchant_code
  const fawrySecureKey = request.headers.get("x-fawry-secure-key") || rawJson?.provider_credentials?.secure_key
  const fawryBaseUrl = request.headers.get("x-fawry-base-url") || rawJson?.provider_credentials?.base_url

  const stripeSecretKey = request.headers.get("x-stripe-secret-key") || rawJson?.provider_credentials?.stripe_secret_key

  // 3. If not handled by Rust Gateway, execute native provider adapter
  if (!gatewayResult) {
    try {
      if (provider === "paymob") {
        const paymobConfigOverride =
          paymobSecretKey || paymobPublicKey || paymobHmacSecret
            ? {
                secretKey: paymobSecretKey,
                publicKey: paymobPublicKey,
                hmacSecret: paymobHmacSecret,
                integrationIds: paymobIntegrationId ? [paymobIntegrationId] : undefined,
              }
            : undefined

        const result = await createPaymobPayment(
          {
            amountMinorUnits,
            currency,
            customer: { phone: customerPhone, email: customerEmail, fullName: customerName },
            merchantReference: merchantRef || undefined,
            description,
            returnUrl,
            idempotencyKey,
          },
          paymobConfigOverride
        )
        providerReference = result.providerReference
        status = result.status
        nextActionType = result.nextAction.type
        nextActionPayload = result.nextAction.url
      } else if (provider === "fawry") {
        const fawryConfigOverride =
          fawryMerchantCode || fawrySecureKey
            ? {
                merchantCode: fawryMerchantCode,
                secureKey: fawrySecureKey,
                baseUrl: fawryBaseUrl,
              }
            : undefined

        const result = await createFawryPayment(
          {
            amountMinorUnits,
            currency,
            customer: { phone: customerPhone, email: customerEmail, fullName: customerName },
            merchantReference: merchantRef || undefined,
            description,
            idempotencyKey,
          },
          fawryConfigOverride
        )
        providerReference = result.providerReference
        status = result.status
        nextActionType = result.nextAction.type
        nextActionPayload = result.nextAction.reference
      } else if (provider === "stripe") {
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
      } else {
        // Deterministic Mock Provider (mock_paymob, mock_fawry, sandbox)
        const result = createMockPayment({
          provider,
          amountMinorUnits,
          currency,
          merchantReference: merchantRef || undefined,
          description,
        })
        providerReference = result.providerReference
        status = result.status
        nextActionType = result.nextAction.type
        nextActionPayload = result.nextAction.type === "redirect_to_url" ? result.nextAction.url : result.nextAction.reference
      }
    } catch (err) {
      console.error("Provider execution error:", err)
      await recordApiRequest({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 502,
        startedAt,
      })
      return NextResponse.json(
        { error: { code: "provider_error", message: `Upstream provider error: ${(err as Error).message}` } },
        { status: 502 }
      )
    }
  }

  // 4. Record payment in database
  const [created] = await db
    .insert(payments)
    .values({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  await recordApiRequest({
    userId: key.userId,
    apiKeyId: key.id,
    method: "POST",
    endpoint: "/api/v1/payments",
    statusCode: 201,
    startedAt,
  })

  return NextResponse.json(
    {
      payment_id: created.id,
      provider: created.provider,
      provider_reference: created.providerReference,
      status: created.status,
      amount_minor_units: created.amountMinorUnits,
      currency: created.currency,
      merchant_reference: created.merchantReference,
      ...(nextActionType
        ? {
            next_action:
              nextActionType === "redirect_to_url"
                ? { type: "redirect_to_url", url: nextActionPayload }
                : {
                    type: "pay_at_reference",
                    reference: nextActionPayload,
                    instructions: `Pay at any ${provider === "fawry" ? "Fawry" : "kiosk"} outlet using reference code: ${nextActionPayload}`,
                  },
          }
        : {}),
    },
    { status: 201 }
  )
}

export async function GET(request: Request) {
  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key." } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)))

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, key.userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)

  await recordApiRequest({
    userId: key.userId,
    apiKeyId: key.id,
    method: "GET",
    endpoint: "/api/v1/payments",
    statusCode: 200,
    startedAt,
  })

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
      customer: {
        phone: p.customerPhone,
        email: p.customerEmail,
        name: p.customerName,
      },
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
