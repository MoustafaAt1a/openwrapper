/**
 * Provider credentials for live integration tests.
 * Set PAYMOB_* / STRIPE_SECRET_KEY in the environment to enable live payment tests.
 */

export const FAWRY_HEADERS = {
  "X-Fawry-Merchant-Code": process.env.FAWRY_MERCHANT_CODE || "sandbox_merchant_code",
  "X-Fawry-Secure-Key": process.env.FAWRY_SECURE_KEY || "sandbox_secure_key",
  "X-Fawry-Base-Url": process.env.FAWRY_BASE_URL || "https://atfawry.fawrystaging.com",
}

export const PAYMOB_DUMMY_HEADERS = {
  "X-Paymob-Secret-Key": "test_secret",
  "X-Paymob-Public-Key": "test_public",
  "X-Paymob-Hmac-Secret": "test_hmac",
  "X-Paymob-Integration-Id": "12345",
}

export const STRIPE_DUMMY_HEADERS = {
  "X-Stripe-Secret-Key": "sk_test_invalid_openwrapper_dummy",
}

export function paymobHeadersFromEnv() {
  const secretKey = process.env.PAYMOB_SECRET_KEY?.trim()
  const publicKey = process.env.PAYMOB_PUBLIC_KEY?.trim()
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET?.trim()
  const integrationId = process.env.PAYMOB_INTEGRATION_ID?.trim()
  if (!secretKey || !publicKey || !hmacSecret || !integrationId) {
    return null
  }
  const headers = {
    "X-Paymob-Secret-Key": secretKey,
    "X-Paymob-Public-Key": publicKey,
    "X-Paymob-Hmac-Secret": hmacSecret,
    "X-Paymob-Integration-Id": integrationId,
  }
  const baseUrl = process.env.PAYMOB_BASE_URL?.trim()
  if (baseUrl) {
    headers["X-Paymob-Base-Url"] = baseUrl
  }
  return headers
}

export function stripeHeadersFromEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) {
    return null
  }
  return { "X-Stripe-Secret-Key": secretKey }
}

export function hasPaymobCredentials() {
  return paymobHeadersFromEnv() !== null
}

export function hasStripeCredentials() {
  return stripeHeadersFromEnv() !== null
}
