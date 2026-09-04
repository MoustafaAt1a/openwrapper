const PAYMOB_HEADERS = [
  "x-paymob-secret-key",
  "x-paymob-public-key",
  "x-paymob-hmac-secret",
  "x-paymob-integration-id",
] as const

const FAWRY_HEADERS = ["x-fawry-merchant-code", "x-fawry-secure-key"] as const

function hasHeader(headers: Headers, name: string): boolean {
  const value = headers.get(name)?.trim()
  return Boolean(value)
}

export type CredentialValidation = { ok: true } | { ok: false; message: string }

export function validateProviderCredentials(
  provider: string,
  headers: Headers,
  body?: { provider_credentials?: { stripe_secret_key?: string } } | null,
): CredentialValidation {
  switch (provider) {
    case "paymob": {
      const missing = PAYMOB_HEADERS.filter((h) => !hasHeader(headers, h))
      if (missing.length > 0) {
        return {
          ok: false,
          message:
            "Paymob credentials missing. Provide X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, and X-Paymob-Integration-Id headers.",
        }
      }
      return { ok: true }
    }
    case "fawry": {
      const missing = FAWRY_HEADERS.filter((h) => !hasHeader(headers, h))
      if (missing.length > 0) {
        return {
          ok: false,
          message:
            "Fawry credentials missing. Provide X-Fawry-Merchant-Code and X-Fawry-Secure-Key headers.",
        }
      }
      return { ok: true }
    }
    case "stripe": {
      const stripeKey =
        headers.get("x-stripe-secret-key")?.trim() ||
        body?.provider_credentials?.stripe_secret_key?.trim()
      if (!stripeKey) {
        return {
          ok: false,
          message: "Stripe credentials missing. Provide X-Stripe-Secret-Key header.",
        }
      }
      return { ok: true }
    }
    default:
      return { ok: true }
  }
}
