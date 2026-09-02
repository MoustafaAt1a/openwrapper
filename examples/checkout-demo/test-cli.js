import { randomUUID } from "node:crypto"
import { OpenWrapperClient } from "@openwrapper/sdk"

const baseUrl = process.env.OPENWRAPPER_BASE_URL || "http://localhost:3000/api"
const apiKey = process.env.OPENWRAPPER_API_KEY
if (!apiKey) {
  console.error("OPENWRAPPER_API_KEY is required for the live CLI test")
  process.exit(2)
}

const client = new OpenWrapperClient({
  baseUrl,
  apiKey,
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
      baseUrl: process.env.PAYMOB_BASE_URL,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secureKey: process.env.FAWRY_SECURE_KEY,
      baseUrl: process.env.FAWRY_BASE_URL,
    },
    stripe: { secretKey: process.env.STRIPE_SECRET_KEY },
  },
})

const requestedProviders = (process.env.OPENWRAPPER_TEST_PROVIDERS || "paymob,fawry,stripe")
  .split(",")
  .map(value => value.trim().toLowerCase())
  .filter(Boolean)
const supportedProviders = new Set(["paymob", "fawry", "stripe"])
let failures = 0

console.log(`Testing ${baseUrl} with providers: ${requestedProviders.join(", ")}`)
for (const provider of requestedProviders) {
  if (!supportedProviders.has(provider)) {
    console.error(`FAIL ${provider}: unsupported test provider`)
    failures++
    continue
  }

  const operationId = `cli_${provider}_${randomUUID()}`
  try {
    const payment = await client.payments.create(
      {
        provider,
        amountMinorUnits: 15000,
        currency: "EGP",
        customer: {
          phone: "+201000000000",
          email: "checkout-cli@example.com",
          fullName: "Checkout CLI",
        },
        merchantReference: operationId,
        description: "OpenWrapper live SDK check",
      },
      { idempotencyKey: operationId }
    )
    const retrieved = await client.payments.get(payment.paymentId)
    if (retrieved.paymentId !== payment.paymentId) {
      throw new Error(`retrieved payment ID ${retrieved.paymentId} did not match`)
    }
    console.log(`PASS ${provider}: ${payment.paymentId} (${retrieved.status})`)
  } catch (error) {
    failures++
    console.error(`FAIL ${provider}: ${error.message || error}`)
  }
}

if (failures > 0) {
  console.error(`${failures} live check(s) failed`)
  process.exitCode = 1
} else {
  console.log("All live checks passed")
}
