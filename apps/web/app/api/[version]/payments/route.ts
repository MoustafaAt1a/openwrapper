import { randomUUID } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest, scheduleApiRequestRecord } from "@/lib/api-request-authenticator"
import { validateApiVersion } from "@/lib/api-version"
import { computeCanonicalFingerprint } from "@/lib/cryptographic-signatures"
import { db } from "@/lib/db"
import { payments } from "@/lib/db/schema"
import { forwardPaymentToRustGateway, getGatewayUrl } from "@/lib/gateway-bridge"
import {
  findIdempotentPayment,
  paymentToApiResponse,
  persistPaymentRecord,
} from "@/lib/payment-ledger-service"
import { validateProviderCredentials } from "@/lib/provider-credentials"
import { readLimitedTextBody } from "@/lib/request-body-reader"
import { createStripeCheckoutSession } from "@/lib/stripe-rail"

function sanitize(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

const boundedString = (maxLength: number) => z.string().trim().max(maxLength).transform(sanitize)
const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "https:" || protocol === "http:"
  }, "URL must use HTTP or HTTPS")
const amountSchema = z.number().int().positive().max(2_147_483_647)

const paymentInputSchema = z.object({
  provider: boundedString(20)
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(["paymob", "fawry", "stripe", "mock"]))
    .default("paymob"),
  amount_minor_units: amountSchema.optional(),
  amount: amountSchema.optional(),
  currency: boundedString(3)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/))
    .default("EGP"),
  customer: z.object({
    phone: boundedString(32).pipe(z.string().min(3, "Customer phone is required")),
    email: z.string().trim().email().max(254).nullable().optional(),
    full_name: boundedString(200).nullable().optional(),
    fullName: boundedString(200).nullable().optional(),
  }),
  merchant_reference: boundedString(255).nullable().optional(),
  merchantReference: boundedString(255).nullable().optional(),
  description: boundedString(500).nullable().optional(),
  return_url: httpUrl.nullable().optional(),
  returnUrl: httpUrl.nullable().optional(),
  metadata: z
    .preprocess(
      (val) => (Array.isArray(val) && val.length === 0 ? {} : val),
      z
        .record(z.string().max(64), z.string().max(1000))
        .refine(
          (value) => Object.keys(value).length <= 50,
          "Metadata may contain at most 50 entries",
        ),
    )
    .nullable()
    .optional(),
})

function computeFingerprint(payload: unknown): string {
  return computeCanonicalFingerprint(payload)
}

function extractApiToken(request: Request): string | undefined {
  return (
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    request.headers.get("x-api-key")?.trim() ||
    undefined
  )
}

export async function POST(request: Request, context: { params: Promise<{ version: string }> }) {
  const { version: rawVersion } = await context.params
  const versionCheck = validateApiVersion(rawVersion)
  if (!versionCheck.valid) {
    return versionCheck.errorResponse!
  }
  const version = versionCheck.version!
  const endpoint = `/api/${version}/payments`

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
        { status: 401 },
      )
    }

    const token = extractApiToken(request)
    const isTestMode =
      key.environment === "test" ||
      request.headers.get("x-openwrapper-environment")?.toLowerCase() === "test" ||
      Boolean(token?.startsWith("ow_test_")) ||
      token === "ow_test_sandbox_demo" ||
      token === "ow_demo_sandbox_key"
    const environment: "live" | "test" = isTestMode ? "test" : "live"

    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey || !/^[\x21-\x7E]{1,200}$/.test(idempotencyKey)) {
      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 400,
        startedAt,
        environment,
      })
      return NextResponse.json(
        {
          error: {
            code: "invalid_request",
            message: "An Idempotency-Key header (1-200 printable ASCII characters) is required.",
          },
        },
        { status: 400 },
      )
    }

    const rawBody = await readLimitedTextBody(request)
    if (!rawBody.ok) {
      return NextResponse.json(
        { error: { code: "payload_too_large", message: "Request body must not exceed 64 KiB." } },
        { status: 413 },
      )
    }
    let rawJson: unknown = null
    try {
      rawJson = JSON.parse(rawBody.text)
    } catch {
      rawJson = null
    }
    const parsed = paymentInputSchema.safeParse(rawJson)
    if (!parsed.success) {
      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 422,
        startedAt,
        environment,
      })
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Invalid payment request payload",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        },
        { status: 422 },
      )
    }

    const data = parsed.data
    const amountMinorUnits = data.amount_minor_units || data.amount
    if (!amountMinorUnits || amountMinorUnits <= 0) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "amount_minor_units must be a positive integer",
          },
        },
        { status: 422 },
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

    const idemLookup = await findIdempotentPayment(key.userId, idempotencyKey, environment)
    if (idemLookup.crossTenant) {
      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 409,
        startedAt,
        environment,
      })
      return NextResponse.json(
        {
          error: {
            code: "idempotency_conflict",
            message: "Idempotency key is already in use by another account.",
          },
        },
        { status: 409 },
      )
    }

    if (idemLookup.row) {
      const existing = idemLookup.row
      if (existing.requestFingerprint !== fingerprint) {
        scheduleApiRequestRecord({
          userId: key.userId,
          apiKeyId: key.id,
          method: "POST",
          endpoint,
          statusCode: 409,
          startedAt,
          environment,
        })
        return NextResponse.json(
          {
            error: {
              code: "idempotency_conflict",
              message: "Idempotency key was already used with different request parameters.",
            },
          },
          { status: 409 },
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
        metadataJson: existing.metadataJson || JSON.stringify({ ...metadata, environment }),
        environment,
      })

      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 200,
        startedAt,
        environment,
      })
      return NextResponse.json(paymentToApiResponse(attached, provider))
    }

    const credCheck = validateProviderCredentials(
      provider,
      request.headers,
      rawJson as { provider_credentials?: { stripe_secret_key?: string } } | null,
      { isTestMode },
    )
    if (!credCheck.ok) {
      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 422,
        startedAt,
      })
      return NextResponse.json(
        { error: { code: "missing_provider_credentials", message: credCheck.message } },
        { status: 422 },
      )
    }

    let paymentId = `pay_${randomUUID().replaceAll("-", "").slice(0, 24)}`
    let providerReference: string | null = null
    let status: "pending" | "succeeded" | "failed" | "unknown" = "pending"
    let nextActionType: string | null = null
    let nextActionPayload: string | null = null
    let routingLatencyMs: number | undefined

    if (provider === "paymob" || provider === "fawry") {
      let gatewayHandled = false
      if (getGatewayUrl()) {
        const gatewayStarted = performance.now()
        const gatewayResult = await forwardPaymentToRustGateway(
          canonicalPayload,
          idempotencyKey,
          token,
          request.headers,
          version,
        )
        routingLatencyMs = Math.round(performance.now() - gatewayStarted)
        if (gatewayResult.ok) {
          paymentId = gatewayResult.data.payment_id
          providerReference = gatewayResult.data.provider_reference
          status = gatewayResult.data.status
          nextActionType = gatewayResult.data.next_action?.type || null
          nextActionPayload =
            gatewayResult.data.next_action?.url || gatewayResult.data.next_action?.reference || null
          gatewayHandled = true
        } else if (
          gatewayResult.code !== "gateway_unreachable" &&
          gatewayResult.code !== "gateway_unavailable"
        ) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
            statusCode: gatewayResult.status,
            startedAt,
            routingLatencyMs,
          })
          return NextResponse.json(
            {
              error: { code: gatewayResult.code || "gateway_error", message: gatewayResult.error },
            },
            { status: gatewayResult.status },
          )
        }
      }

      if (!gatewayHandled) {
        if (!isTestMode && !getGatewayUrl()) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
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
            { status: 503 },
          )
        }

        // Test/sandbox standalone fallback simulation when gateway is unreachable or unconfigured
        if (provider === "fawry") {
          const num =
            Math.abs(
              paymentId.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0),
            ) % 1_000_000
          const kioskCode = `929${String(num).padStart(6, "0")}`
          providerReference = `fawry_sim_${paymentId}`
          status = "pending"
          nextActionType = "pay_at_reference"
          nextActionPayload = kioskCode
        } else {
          providerReference = `paymob_sim_${paymentId}`
          status = "pending"
          nextActionType = "redirect_to_url"
          nextActionPayload = `https://accept.paymob.com/unifiedcheckout/?intention_id=sim_${paymentId}`
        }
      }
    } else if (provider === "stripe") {
      const stripeSecretKey =
        request.headers.get("x-stripe-secret-key") ||
        (rawJson as { provider_credentials?: { stripe_secret_key?: string } } | null)
          ?.provider_credentials?.stripe_secret_key

      let gatewayHandled = false
      if (getGatewayUrl()) {
        const gatewayStarted = performance.now()
        const gatewayResult = await forwardPaymentToRustGateway(
          canonicalPayload,
          idempotencyKey,
          token,
          request.headers,
          version,
        )
        routingLatencyMs = Math.round(performance.now() - gatewayStarted)
        if (gatewayResult.ok) {
          paymentId = gatewayResult.data.payment_id
          providerReference = gatewayResult.data.provider_reference
          status = gatewayResult.data.status
          nextActionType = gatewayResult.data.next_action?.type || null
          nextActionPayload =
            gatewayResult.data.next_action?.url || gatewayResult.data.next_action?.reference || null
          gatewayHandled = true
        } else if (
          gatewayResult.code !== "gateway_unreachable" &&
          gatewayResult.code !== "gateway_unavailable"
        ) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
            statusCode: gatewayResult.status,
            startedAt,
            routingLatencyMs,
          })
          return NextResponse.json(
            {
              error: { code: gatewayResult.code || "gateway_error", message: gatewayResult.error },
            },
            { status: gatewayResult.status },
          )
        }
      }

      if (!gatewayHandled) {
        if (isTestMode && !stripeSecretKey && !process.env.STRIPE_SECRET_KEY) {
          providerReference = `cs_test_${paymentId}`
          status = "pending"
          nextActionType = "redirect_to_url"
          nextActionPayload = `https://checkout.stripe.com/c/pay/cs_test_${paymentId}`
        } else {
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
              stripeSecretKey || undefined,
            )
            providerReference = result.sessionId
            status = "pending"
            nextActionType = "redirect_to_url"
            nextActionPayload = result.url || ""
          } catch (err) {
            const errMsg = (err as Error).message || "Provider error"
            const isConfigError =
              errMsg.includes("credentials missing") || errMsg.includes("STRIPE")
            if (!isConfigError) console.error("Stripe checkout creation failed:", err)
            const statusCode = isConfigError ? 422 : 502
            scheduleApiRequestRecord({
              userId: key.userId,
              apiKeyId: key.id,
              method: "POST",
              endpoint,
              statusCode,
              startedAt,
            })
            return NextResponse.json(
              {
                error: {
                  code: isConfigError ? "missing_provider_credentials" : "provider_error",
                  message: isConfigError
                    ? "Stripe credentials missing. Provide X-Stripe-Secret-Key header."
                    : "Stripe provider request failed.",
                },
              },
              { status: statusCode },
            )
          }
        }
      }
    } else if (provider === "mock") {
      let gatewayHandled = false
      if (getGatewayUrl()) {
        const gatewayStarted = performance.now()
        const gatewayResult = await forwardPaymentToRustGateway(
          canonicalPayload,
          idempotencyKey,
          token,
          request.headers,
          version,
        )
        routingLatencyMs = Math.round(performance.now() - gatewayStarted)
        if (gatewayResult.ok) {
          paymentId = gatewayResult.data.payment_id
          providerReference = gatewayResult.data.provider_reference
          status = gatewayResult.data.status
          nextActionType = gatewayResult.data.next_action?.type || null
          nextActionPayload =
            gatewayResult.data.next_action?.url || gatewayResult.data.next_action?.reference || null
          gatewayHandled = true
        } else if (
          gatewayResult.code !== "gateway_unreachable" &&
          gatewayResult.code !== "gateway_unavailable"
        ) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
            statusCode: gatewayResult.status,
            startedAt,
            routingLatencyMs,
          })
          return NextResponse.json(
            {
              error: { code: gatewayResult.code || "gateway_error", message: gatewayResult.error },
            },
            { status: gatewayResult.status },
          )
        }
      }

      if (!gatewayHandled) {
        if (amountMinorUnits % 100 === 99) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
            statusCode: 402,
            startedAt,
          })
          return NextResponse.json(
            {
              error: {
                code: "card_declined",
                message: "Simulated card decline (amount ends in 99)",
              },
            },
            { status: 402 },
          )
        }

        if (amountMinorUnits % 100 === 88) {
          scheduleApiRequestRecord({
            userId: key.userId,
            apiKeyId: key.id,
            method: "POST",
            endpoint,
            statusCode: 504,
            startedAt,
          })
          return NextResponse.json(
            {
              error: {
                code: "timeout",
                message: "Simulated network/provider timeout (amount ends in 88)",
              },
            },
            { status: 504 },
          )
        }

        providerReference = `mock_ref_${paymentId}`
        status = "pending"
        if (customerPhone.startsWith("+20") && !returnUrl) {
          const prefix = paymentId.length >= 8 ? paymentId.slice(0, 8) : paymentId
          nextActionType = "pay_at_reference"
          nextActionPayload = `MOCK-${prefix}`
        } else {
          nextActionType = "redirect_to_url"
          nextActionPayload = `https://checkout.openwrapper.internal/mock/pay/${paymentId}`
        }
      }
    } else {
      scheduleApiRequestRecord({
        userId: key.userId,
        apiKeyId: key.id,
        method: "POST",
        endpoint,
        statusCode: 422,
        startedAt,
      })
      return NextResponse.json(
        {
          error: {
            code: "unsupported_provider",
            message: `Unsupported provider "${provider}". Supported: paymob, fawry, stripe, mock.`,
          },
        },
        { status: 422 },
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
      metadataJson: JSON.stringify({ ...metadata, environment }),
      environment,
    })

    scheduleApiRequestRecord({
      userId: key.userId,
      apiKeyId: key.id,
      method: "POST",
      endpoint,
      statusCode: 201,
      startedAt,
      routingLatencyMs: routingLatencyMs !== undefined ? routingLatencyMs : undefined,
      environment,
    })

    return NextResponse.json(paymentToApiResponse(created, provider), { status: 201 })
  } catch (err) {
    console.error(`[POST ${endpoint}] unexpected error:`, err)
    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred while processing the payment.",
        },
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request, context: { params: Promise<{ version: string }> }) {
  const { version: rawVersion } = await context.params
  const versionCheck = validateApiVersion(rawVersion)
  if (!versionCheck.valid) {
    return versionCheck.errorResponse!
  }
  const version = versionCheck.version!
  const endpoint = `/api/${version}/payments`

  const startedAt = performance.now()
  const key = await authenticateApiRequest(request)
  if (!key) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key." } },
      { status: 401 },
    )
  }

  const { searchParams } = new URL(request.url)
  const parsedLimit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .safeParse(searchParams.get("limit") ?? 50)
  if (!parsedLimit.success) {
    return NextResponse.json(
      {
        error: { code: "invalid_request", message: "limit must be an integer between 1 and 100." },
      },
      { status: 400 },
    )
  }

  const token = extractApiToken(request)
  const isTestMode =
    key.environment === "test" ||
    request.headers.get("x-openwrapper-environment")?.toLowerCase() === "test" ||
    Boolean(token?.startsWith("ow_test_")) ||
    token === "ow_test_sandbox_demo" ||
    token === "ow_demo_sandbox_key"
  const environment: "live" | "test" = isTestMode ? "test" : "live"

  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, key.userId), eq(payments.environment, environment)))
    .orderBy(desc(payments.createdAt))
    .limit(parsedLimit.data)

  scheduleApiRequestRecord({
    userId: key.userId,
    apiKeyId: key.id,
    method: "GET",
    endpoint,
    statusCode: 200,
    startedAt,
    environment,
  })

  return NextResponse.json(
    {
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
              ...(p.nextActionType === "redirect_to_url"
                ? { url: p.nextActionPayload }
                : { reference: p.nextActionPayload }),
            }
          : undefined,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
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
