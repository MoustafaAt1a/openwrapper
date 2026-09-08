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

function hasAmbientPaymob(): boolean {
  return Boolean(
    process.env.PAYMOB_SECRET_KEY?.trim() &&
    process.env.PAYMOB_PUBLIC_KEY?.trim() &&
    process.env.PAYMOB_HMAC_SECRET?.trim() &&
    process.env.PAYMOB_INTEGRATION_ID?.trim(),
  )
}

function hasAmbientFawry(): boolean {
  return Boolean(process.env.FAWRY_MERCHANT_CODE?.trim() && process.env.FAWRY_SECURE_KEY?.trim())
}

function hasAmbientStripe(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export type CredentialValidation = { ok: true } | { ok: false; message: string }

export function validateProviderCredentials(
  provider: string,
  headers: Headers,
  body?: { provider_credentials?: { stripe_secret_key?: string } } | null,
  options?: { isTestMode?: boolean },
): CredentialValidation {
  const isTest =
    options?.isTestMode ||
    headers.get("x-openwrapper-environment")?.toLowerCase() === "test" ||
    headers.get("authorization")?.toLowerCase().includes("ow_test_") ||
    headers.get("x-api-key")?.toLowerCase().includes("ow_test_") ||
    headers.get("authorization")?.toLowerCase().includes("sandbox") ||
    headers.get("x-api-key")?.toLowerCase().includes("sandbox")

  if (isTest) {
    return { ok: true }
  }

  switch (provider) {
    case "paymob": {
      if (hasAmbientPaymob()) return { ok: true }
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
      if (hasAmbientFawry()) return { ok: true }
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
      if (hasAmbientStripe()) return { ok: true }
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
