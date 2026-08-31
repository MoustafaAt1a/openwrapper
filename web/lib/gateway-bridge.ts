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

export function getGatewayUrl(): string | null {
  return process.env.OPENWRAPPER_GATEWAY_URL || null
}

/** Headers that must be forwarded to the Rust gateway for stateless provider routing */
const FORWARDED_HEADER_PREFIXES = [
  "x-paymob-",
  "x-fawry-",
  "x-stripe-",
]

/**
 * Forward a payment request to the Rust gateway, including all
 * per-request provider credential headers (stateless mode).
 */
export async function forwardPaymentToRustGateway(
  request: GatewayPaymentRequest,
  idempotencyKey: string,
  apiKey?: string,
  incomingHeaders?: Headers
): Promise<GatewayPaymentResponse | null> {
  const gatewayUrl = getGatewayUrl()
  if (!gatewayUrl) return null

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
      headers["X-API-Key"] = apiKey
    }

    // Forward per-request provider credential headers
    if (incomingHeaders) {
      for (const [key, value] of incomingHeaders.entries()) {
        const lowerKey = key.toLowerCase()
        if (FORWARDED_HEADER_PREFIXES.some((prefix) => lowerKey.startsWith(prefix))) {
          headers[key] = value
        }
      }
    }

    const response = await fetch(`${gatewayUrl.replace(/\/+$/, "")}/v1/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GatewayPaymentResponse
  } catch {
    return null
  }
}
