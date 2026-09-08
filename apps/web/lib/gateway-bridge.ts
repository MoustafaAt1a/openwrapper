export interface GatewayPaymentRequest {
  provider: string
  amount_minor_units: number
  currency: string
  customer: {
    phone: string
    email?: string
    full_name?: string
  }
  merchant_reference?: string | null
  description?: string
  return_url?: string
  metadata?: Record<string, string>
}

export interface GatewayPaymentResponse {
  payment_id: string
  provider: string
  provider_reference: string | null
  status: "pending" | "succeeded" | "failed" | "unknown"
  amount_minor_units: number
  currency: string
  merchant_reference: string | null
  next_action?: {
    type: "redirect_to_url" | "pay_at_reference"
    url?: string
    reference?: string
    instructions?: string
  }
}

export type GatewayResult =
  | { ok: true; data: GatewayPaymentResponse }
  | { ok: false; status: number; error: string; code?: string }

export function getGatewayUrl(): string | null {
  const configured = process.env.OPENWRAPPER_GATEWAY_URL
  if (!configured) return null
  try {
    const url = new URL(configured)
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return null
    }
    return url.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

const FORWARDED_HEADER_PREFIXES = [
  "x-paymob-",
  "x-fawry-",
  "x-stripe-",
  "x-mock-",
  "x-openwrapper-",
]

function buildForwardHeaders(apiKey?: string, incomingHeaders?: Headers): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
    headers["X-API-Key"] = apiKey
    if (
      apiKey.startsWith("ow_test_") ||
      apiKey === "ow_test_sandbox_demo" ||
      apiKey === "ow_demo_sandbox_key"
    ) {
      headers["X-OpenWrapper-Environment"] = "test"
    }
  }
  if (incomingHeaders) {
    for (const [key, value] of incomingHeaders.entries()) {
      const lowerKey = key.toLowerCase()
      if (FORWARDED_HEADER_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
        headers[key] = value
      }
    }
    if (incomingHeaders.get("x-openwrapper-environment")?.toLowerCase() === "test") {
      headers["X-OpenWrapper-Environment"] = "test"
    }
  }

  // Inject ambient provider credentials if not explicitly supplied by client
  if (!headers["x-paymob-secret-key"] && process.env.PAYMOB_SECRET_KEY) {
    headers["X-Paymob-Secret-Key"] = process.env.PAYMOB_SECRET_KEY
  }
  if (!headers["x-paymob-public-key"] && process.env.PAYMOB_PUBLIC_KEY) {
    headers["X-Paymob-Public-Key"] = process.env.PAYMOB_PUBLIC_KEY
  }
  if (!headers["x-paymob-hmac-secret"] && process.env.PAYMOB_HMAC_SECRET) {
    headers["X-Paymob-Hmac-Secret"] = process.env.PAYMOB_HMAC_SECRET
  }
  if (!headers["x-paymob-integration-id"] && process.env.PAYMOB_INTEGRATION_ID) {
    headers["X-Paymob-Integration-Id"] = process.env.PAYMOB_INTEGRATION_ID
  }
  if (!headers["x-fawry-merchant-code"] && process.env.FAWRY_MERCHANT_CODE) {
    headers["X-Fawry-Merchant-Code"] = process.env.FAWRY_MERCHANT_CODE
  }
  if (!headers["x-fawry-secure-key"] && process.env.FAWRY_SECURE_KEY) {
    headers["X-Fawry-Secure-Key"] = process.env.FAWRY_SECURE_KEY
  }
  if (!headers["x-stripe-secret-key"] && process.env.STRIPE_SECRET_KEY) {
    headers["X-Stripe-Secret-Key"] = process.env.STRIPE_SECRET_KEY
  }

  return headers
}

async function parseGatewayError(response: Response): Promise<{ error: string; code?: string }> {
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string } }
    const message = body.error?.message || `Gateway error (${response.status})`
    let code = body.error?.code
    if (!code && /credentials missing/i.test(message)) {
      code = "missing_provider_credentials"
    }
    return { error: message, code }
  } catch {
    return { error: `Gateway error (${response.status})` }
  }
}

export async function forwardPaymentToRustGateway(
  request: GatewayPaymentRequest,
  idempotencyKey: string,
  apiKey?: string,
  incomingHeaders?: Headers,
  version: string = "v1",
): Promise<GatewayResult> {
  const gatewayUrl = getGatewayUrl()
  if (!gatewayUrl) {
    return {
      ok: false,
      status: 503,
      error: "Rust gateway is not configured",
      code: "gateway_unavailable",
    }
  }

  try {
    const response = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/${version}/payments`, {
      method: "POST",
      headers: {
        ...buildForwardHeaders(apiKey, incomingHeaders),
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const { error, code } = await parseGatewayError(response)
      const normalizedCode =
        code === "validation_error" && /credentials missing/i.test(error)
          ? "missing_provider_credentials"
          : code
      const status = normalizedCode === "missing_provider_credentials" ? 422 : response.status
      return { ok: false, status, error, code: normalizedCode }
    }

    return { ok: true, data: (await response.json()) as GatewayPaymentResponse }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Could not reach Rust gateway: ${(err as Error).message}`,
      code: "gateway_unreachable",
    }
  }
}

export async function getPaymentFromRustGateway(
  paymentId: string,
  apiKey?: string,
  incomingHeaders?: Headers,
  version: string = "v1",
): Promise<GatewayResult> {
  const gatewayUrl = getGatewayUrl()
  if (!gatewayUrl) {
    return {
      ok: false,
      status: 503,
      error: "Rust gateway is not configured",
      code: "gateway_unavailable",
    }
  }

  try {
    const response = await fetch(
      `${gatewayUrl.replace(/\/+$/, "")}/${version}/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers: buildForwardHeaders(apiKey, incomingHeaders),
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!response.ok) {
      const { error, code } = await parseGatewayError(response)
      return { ok: false, status: response.status, error, code }
    }

    return { ok: true, data: (await response.json()) as GatewayPaymentResponse }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Could not reach Rust gateway: ${(err as Error).message}`,
      code: "gateway_unreachable",
    }
  }
}
