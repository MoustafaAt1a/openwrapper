import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { OpenWrapperClient } from "@openwrapper/sdk"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envFiles = [
    join(__dirname, ".env"),
    join(__dirname, "..", ".env"),
    join(__dirname, "..", "..", ".env"),
  ]
  for (const envPath of envFiles) {
    if (!existsSync(envPath)) continue
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const idx = trimmed.indexOf("=")
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const value = trimmed.slice(idx + 1).trim()
        if (!process.env[key]) process.env[key] = value
      }
    }
  }
}
loadEnv()

const baseUrl = process.env.OPENWRAPPER_BASE_URL || "http://localhost:3000/api"
const apiKey = process.env.OPENWRAPPER_API_KEY || undefined

console.log("\n=======================================================")
console.log("  OpenWrapper TypeScript SDK (v0.1.2) - Live Test")
console.log("=======================================================")
console.log(`Target Base URL: ${baseUrl}`)
console.log(`API Key        : ${apiKey ? apiKey.slice(0, 10) + "..." : "(unset/stateless)"}\n`)

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

const targetProvider = process.env.OPENWRAPPER_TEST_PROVIDER || "paymob"
const orderRef = `cli_ts_${randomUUID().replace(/-/g, "").slice(0, 12)}`

console.log(`[1/2] Initiating ${targetProvider} payment of EGP 150.00 (order: ${orderRef})...`)

try {
  const payment = await client.payments.create(
    {
      provider: targetProvider,
      amountMinorUnits: 15000,
      currency: "EGP",
      customer: {
        phone: "+201001234567",
        email: "ts-tester@example.com",
        fullName: "TypeScript CLI Tester",
      },
      merchantReference: orderRef,
      description: "TypeScript CLI Live Checkout Verification",
    },
    { idempotencyKey: orderRef },
  )

  console.log(`  -> Payment ID : ${payment.paymentId}`)
  console.log(`  -> Status     : ${payment.status}`)
  console.log(`  -> Amount     : EGP ${(payment.amountMinorUnits / 100).toFixed(2)}`)

  if (payment.nextAction) {
    console.log(`  -> Next Action: ${payment.nextAction.type}`)
    if (payment.nextAction.url) {
      console.log(`     Checkout URL: ${payment.nextAction.url}`)
    }
    if (payment.nextAction.reference) {
      console.log(`     Kiosk Code  : ${payment.nextAction.reference}`)
    }
  }

  console.log("\n[2/2] Polling payment resolution via client.payments.get()...")
  const fetched = await client.payments.get(payment.paymentId)
  console.log(`  -> Verified Status: ${fetched.status}`)
  console.log(`  -> Provider Ref   : ${fetched.providerReference || "N/A"}`)

  console.log("\n✔ SUCCESS: TypeScript SDK transaction completed and verified cleanly.\n")
} catch (error) {
  console.error(`\n✖ ERROR: Transaction failed: ${error.message || error}\n`)
  process.exitCode = 1
}
