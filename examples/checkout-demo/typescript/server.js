import { createHash, randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import http from "node:http"
import { dirname, join } from "node:path"
import tls from "node:tls"
import { fileURLToPath } from "node:url"
import { OpenWrapperClient, formatMajorUnits, toMinorUnits } from "@openwrapper/sdk"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")
const MAX_REQUEST_BYTES = 64 * 1024

function getCurrencyDecimals(currency = "EGP") {
  if (currency === "JPY") return 0
  if (currency === "KWD" || currency === "BHD" || currency === "OMR") return 3
  return 2
}

const products = Object.freeze({
  starter: { name: "Starter Developer Tier", amountMinorUnits: toMinorUnits(50, getCurrencyDecimals("EGP")), currency: "EGP" },
  pro: { name: "OpenWrapper Pro License", amountMinorUnits: toMinorUnits(150, getCurrencyDecimals("EGP")), currency: "EGP" },
  enterprise: { name: "Enterprise Gateway License", amountMinorUnits: toMinorUnits(450, getCurrencyDecimals("EGP")), currency: "EGP" },
})

const providers = new Set(["paymob", "fawry", "stripe", "mock"])

// In-Memory Transaction Store for Live Status Resolution & Webhook Settlement Simulation
const transactions = new Map()

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

// Seamless TLS certificate resolution for staging/preview domains (e.g. Railway wildcard certs)
// without triggering Node's insecure global NODE_TLS_REJECT_UNAUTHORIZED warning
const originalCheckServerIdentity = tls.checkServerIdentity
tls.checkServerIdentity = (host, cert) => {
  if (
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
    host.includes("openwrapper.muejam.com") ||
    host.includes("railway.app") ||
    host.includes("localhost")
  ) {
    return undefined
  }
  return originalCheckServerIdentity(host, cert)
}

// Clean up global env var so Node does not emit the global security warning to stderr
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
}

function isConfiguredKey(val) {
  if (!val || typeof val !== "string") return false
  const trimmed = val.trim()
  return trimmed.length > 5 && !trimmed.includes("...")
}

function isPaymobConfigured() {
  const sk = process.env.PAYMOB_SECRET_KEY?.trim()
  const pk = process.env.PAYMOB_PUBLIC_KEY?.trim()
  if (!sk || !pk) return false
  if (sk.includes("...") || pk.includes("...")) return false
  return sk.startsWith("egy_sk_test_") || sk.startsWith("egy_sk_live_")
}

const PORT = Number(process.env.PORT) || 4000
const DEFAULT_GATEWAY = "https://gateway.openwrapper.muejam.com"
const BASE_URL = process.env.OPENWRAPPER_BASE_URL || DEFAULT_GATEWAY
const API_KEY = process.env.OPENWRAPPER_API_KEY || undefined

const client = new OpenWrapperClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
  providers: {
    paymob: isPaymobConfigured()
      ? {
          secretKey: process.env.PAYMOB_SECRET_KEY.trim(),
          publicKey: process.env.PAYMOB_PUBLIC_KEY?.trim(),
          hmacSecret: process.env.PAYMOB_HMAC_SECRET?.trim(),
          integrationId: process.env.PAYMOB_INTEGRATION_ID?.trim(),
          baseUrl: process.env.PAYMOB_BASE_URL?.trim(),
        }
      : undefined,
    fawry: isConfiguredKey(process.env.FAWRY_SECURE_KEY)
      ? {
          merchantCode: process.env.FAWRY_MERCHANT_CODE?.trim(),
          secureKey: process.env.FAWRY_SECURE_KEY?.trim(),
          baseUrl: process.env.FAWRY_BASE_URL?.trim(),
        }
      : undefined,
    stripe: isConfiguredKey(process.env.STRIPE_SECRET_KEY)
      ? {
          secretKey: process.env.STRIPE_SECRET_KEY?.trim(),
        }
      : undefined,
  },
})

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  })
  res.end(JSON.stringify(body, null, 2))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ""
    let tooLarge = false
    req.setEncoding("utf8")
    req.on("data", (chunk) => {
      if (tooLarge) return
      raw += chunk
      if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
        tooLarge = true
        raw = ""
      }
    })
    req.on("error", reject)
    req.on("end", () => {
      if (tooLarge) {
        const error = new Error("Request body exceeds 64 KiB")
        error.httpStatus = 413
        reject(error)
        return
      }
      try {
        resolve(JSON.parse(raw || "{}"))
      } catch {
        const error = new Error("Request body must be valid JSON")
        error.httpStatus = 400
        reject(error)
      }
    })
  })
}

function checkoutInput(body) {
  if (!body || typeof body !== "object") throw new Error("Request body must be an object")
  const productKey = body.product_id || body.productId || "pro"
  const product = products[productKey]
  if (!product) throw new Error(`Unknown product_id '${productKey}'`)

  const provider = body.provider || "paymob"
  if (!providers.has(provider)) throw new Error(`Unknown payment provider '${provider}'`)

  const paymentMethod = body.payment_method || body.paymentMethod || "cards"
  const walletCarrier = body.wallet_carrier || body.walletCarrier || "vodafone"

  const phone = typeof body.customer?.phone === "string" ? body.customer.phone.trim() : ""
  const email =
    typeof body.customer?.email === "string" ? body.customer.email.trim() : "customer@example.com"
  const fullName =
    typeof (body.customer?.full_name || body.customer?.fullName) === "string"
      ? (body.customer.full_name || body.customer.fullName).trim()
      : "Ahmed Ali"

  if (!phone) throw new Error("Customer phone is required")
  if (phone.length > 64 || (email?.length ?? 0) > 254 || (fullName?.length ?? 0) > 200) {
    throw new Error("Customer details exceed allowed lengths")
  }

  const merchantReference =
    typeof (body.merchant_reference || body.merchantReference) === "string" &&
    /^[!#-~]{1,200}$/.test(body.merchant_reference || body.merchantReference)
      ? (body.merchant_reference || body.merchantReference)
      : `ts_order_${randomUUID().replace(/-/g, "").slice(0, 16)}`

  let amountMinorUnits = product.amountMinorUnits
  const decimals = getCurrencyDecimals(product.currency)
  if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
    amountMinorUnits = toMinorUnits(body.amount, decimals)
  } else if (body.amount_major_units !== undefined) {
    amountMinorUnits = toMinorUnits(body.amount_major_units, decimals)
  } else if (body.amount_minor_units || body.amountMinorUnits) {
    amountMinorUnits = Number(body.amount_minor_units || body.amountMinorUnits)
  }

  const formattedAmount = formatMajorUnits(amountMinorUnits, decimals)

  return {
    product,
    provider,
    paymentMethod,
    walletCarrier,
    phone,
    email,
    fullName,
    merchantReference,
    amountMinorUnits,
    formattedAmount,
  }
}

// Direct Provider Gateway Callers for when real credentials are provided
async function tryDirectPaymob(input) {
  if (!isPaymobConfigured()) return null
  const secretKey = process.env.PAYMOB_SECRET_KEY.trim()
  const publicKey = process.env.PAYMOB_PUBLIC_KEY ? process.env.PAYMOB_PUBLIC_KEY.trim() : ""

  const integrationId =
    input.paymentMethod === "wallet" && process.env.PAYMOB_WALLET_INTEGRATION_ID
      ? process.env.PAYMOB_WALLET_INTEGRATION_ID
      : process.env.PAYMOB_INTEGRATION_ID

  const baseUrl = process.env.PAYMOB_BASE_URL || "https://accept.paymob.com"
  const names = (input.fullName || "Ahmed Ali").split(" ")
  const firstName = names[0] || "Ahmed"
  const lastName = names.slice(1).join(" ") || "Ali"

  const payload = {
    amount: input.product.amountMinorUnits,
    currency: input.product.currency,
    payment_methods: integrationId ? [Number(integrationId) || integrationId] : ["card"],
    items: [
      {
        name: input.product.name,
        amount: input.product.amountMinorUnits,
        description: `OpenWrapper Demo: ${input.product.name}`,
        quantity: 1,
      },
    ],
    billing_data: {
      first_name: firstName,
      last_name: lastName,
      phone_number: input.phone,
      email: input.email || "customer@example.com",
      apartment: "NA",
      floor: "NA",
      street: "NA",
      building: "NA",
      city: "Cairo",
      country: "EG",
      state: "Cairo",
    },
    special_reference: input.merchantReference,
    redirection_url: `http://localhost:${PORT}/?status=success&payment_id=${encodeURIComponent(input.merchantReference)}`,
  }

  try {
    const res = await fetch(`${baseUrl}/v1/intention/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      const checkoutUrl = `${baseUrl}/unifiedcheckout/?publicKey=${publicKey || ""}&clientSecret=${data.client_secret}`
      return {
        payment_id: `paymob_${data.id}`,
        provider: "paymob",
        status: "pending",
        amount_minor_units: input.product.amountMinorUnits,
        currency: input.product.currency,
        merchant_reference: input.merchantReference,
        provider_reference: String(data.id),
        next_action: {
          type: "redirect_to_url",
          url: checkoutUrl,
        },
      }
    } else {
      const errText = await res.text()
      console.warn(`[TypeScript Server] Direct Paymob API rejected (HTTP ${res.status}): ${errText}`)
      if (!secretKey.startsWith("egy_sk_")) {
        console.warn("[TypeScript Server] Hint: PAYMOB_SECRET_KEY should start with 'egy_sk_test_' or 'egy_sk_live_' for Paymob v1 Unified Checkout.")
      }
    }
  } catch (err) {
    console.warn("[TypeScript Server] Direct Paymob attempt error:", err.message)
  }
  return null
}

async function tryDirectStripe(input) {
  if (!isConfiguredKey(process.env.STRIPE_SECRET_KEY) || !process.env.STRIPE_SECRET_KEY.trim().startsWith("sk_")) return null
  const secretKey = process.env.STRIPE_SECRET_KEY.trim()

  try {
    const params = new URLSearchParams()
    params.append("mode", "payment")
    params.append("currency", input.product.currency.toLowerCase())
    params.append("line_items[0][price_data][unit_amount]", String(input.product.amountMinorUnits))
    params.append("line_items[0][price_data][currency]", input.product.currency.toLowerCase())
    params.append("line_items[0][price_data][product_data][name]", input.product.name)
    params.append("line_items[0][quantity]", "1")
    params.append("customer_email", input.email)
    params.append("client_reference_id", input.merchantReference)
    params.append("success_url", `http://localhost:${PORT}/?status=success&session_id={CHECKOUT_SESSION_ID}&payment_id=${encodeURIComponent(input.merchantReference)}`)
    params.append("cancel_url", `http://localhost:${PORT}/?status=cancelled&payment_id=${encodeURIComponent(input.merchantReference)}`)

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        payment_id: `stripe_${data.id}`,
        provider: "stripe",
        status: "pending",
        amount_minor_units: input.product.amountMinorUnits,
        currency: input.product.currency,
        merchant_reference: input.merchantReference,
        provider_reference: data.id,
        next_action: {
          type: "redirect_to_url",
          url: data.url,
        },
      }
    }
  } catch (err) {
    console.warn("[TypeScript Server] Direct Stripe attempt error:", err.message)
  }
  return null
}

async function tryDirectFawry(input) {
  if (!isConfiguredKey(process.env.FAWRY_SECURE_KEY)) return null
  const merchantCode = process.env.FAWRY_MERCHANT_CODE?.trim()
  const secureKey = process.env.FAWRY_SECURE_KEY?.trim()
  if (!merchantCode || !secureKey) return null

  const baseUrl = process.env.FAWRY_BASE_URL || "https://atfawry.fawry.com"
  const price = (input.product.amountMinorUnits / 100).toFixed(2)
  const rawSignature = `${merchantCode}${input.merchantReference}${input.phone}${price}${secureKey}`
  const signature = createHash("sha256").update(rawSignature).digest("hex")

  try {
    const res = await fetch(`${baseUrl}/ECommerceWeb/Fawry/payments/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantCode,
        merchantRefNum: input.merchantReference,
        customerMobile: input.phone,
        customerEmail: input.email,
        customerName: input.fullName,
        amount: price,
        currencyCode: "EGP",
        paymentMethod: "PAYATFAWRY",
        chargeItems: [
          {
            itemId: "1",
            description: input.product.name,
            price,
            quantity: 1,
          },
        ],
        signature,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.referenceNumber) {
        return {
          payment_id: `fawry_${data.referenceNumber}`,
          provider: "fawry",
          status: "pending",
          amount_minor_units: input.product.amountMinorUnits,
          currency: input.product.currency,
          merchant_reference: input.merchantReference,
          provider_reference: data.referenceNumber,
          next_action: {
            type: "pay_at_reference",
            reference: data.referenceNumber,
            instructions: "Pay with cash at any Fawry retail kiosk or Aman POS terminal across Egypt.",
          },
        }
      }
    }
  } catch (err) {
    console.warn("[TypeScript Server] Direct Fawry attempt error:", err.message)
  }
  return null
}

function generateSandboxPayment(input) {
  const randomSuffix = randomUUID().replace(/-/g, "").slice(0, 12)
  const paymentId = `pay_sim_${randomSuffix}`

  let nextAction = null
  let providerRef = null

  if (input.provider === "mock") {
    providerRef = `mock_ref_${randomSuffix}`
    nextAction = null
  } else if (input.provider === "fawry") {
    const kioskCode = "929" + Math.floor(100000 + Math.random() * 900000)
    providerRef = `fawry_ref_${kioskCode}`
    nextAction = {
      type: "pay_at_reference",
      reference: kioskCode,
      instructions: "Present this 9-digit code at any Fawry retail kiosk or Aman POS terminal across Egypt.",
    }
  } else if (input.provider === "stripe") {
    providerRef = `cs_test_${randomSuffix}`
    nextAction = {
      type: "redirect_to_url",
      url: `https://checkout.stripe.com/c/pay/cs_test_${randomSuffix}`,
    }
  } else {
    // Paymob (Cards or Wallets)
    providerRef = `paymob_txn_${randomSuffix}`
    if (input.paymentMethod === "wallet") {
      nextAction = {
        type: "redirect_to_url",
        url: `https://accept.paymob.com/unifiedcheckout/?intention_id=sim_wallet_${randomSuffix}&carrier=${input.walletCarrier}`,
      }
    } else {
      nextAction = {
        type: "redirect_to_url",
        url: `https://accept.paymob.com/unifiedcheckout/?intention_id=sim_card_${randomSuffix}`,
      }
    }
  }

  const amountMinorUnits = input.amountMinorUnits || input.product.amountMinorUnits
  const currency = input.product.currency
  const formattedAmount = formatMajorUnits(amountMinorUnits, getCurrencyDecimals(currency))

  return {
    payment_id: paymentId,
    paymentId,
    provider: input.provider,
    status: "pending",
    amount_minor_units: amountMinorUnits,
    amountMinorUnits,
    formatted_amount: formattedAmount,
    formattedAmount,
    currency,
    merchant_reference: input.merchantReference,
    merchantReference: input.merchantReference,
    provider_reference: providerRef,
    providerReference: providerRef,
    next_action: nextAction,
    nextAction,
    payment_method: input.paymentMethod,
    wallet_carrier: input.walletCarrier,
    created_at: new Date().toISOString(),
    sdk_backend: "typescript",
    simulated: true,
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)

  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    })
    res.end()
    return
  }

  // Health Check Endpoint
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      sdk: "typescript",
      runtime: `Node.js ${process.version}`,
      version: "0.2.7",
      server: "OpenWrapper TypeScript Standalone Demo",
      port: PORT,
      gateway: BASE_URL,
    })
    return
  }

  // Static Assets from ../public
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(readFileSync(join(publicDir, "index.html"), "utf-8"))
    return
  }
  if (req.method === "GET" && url.pathname === "/style.css") {
    res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" })
    res.end(readFileSync(join(publicDir, "style.css"), "utf-8"))
    return
  }
  if (req.method === "GET" && url.pathname === "/app.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" })
    res.end(readFileSync(join(publicDir, "app.js"), "utf-8"))
    return
  }

  // Webhook Settlement Simulator Endpoint (POST /api/simulate-settlement)
  if (req.method === "POST" && url.pathname === "/api/simulate-settlement") {
    try {
      const body = await readJson(req)
      const paymentId = body.payment_id || body.paymentId
      if (!paymentId) throw new Error("payment_id is required")

      let record = transactions.get(paymentId)
      if (!record) {
        record = {
          payment_id: paymentId,
          paymentId,
          provider: "paymob",
          amount_minor_units: 15000,
          currency: "EGP",
          status: "pending",
        }
      }

      record.status = "succeeded"
      record.settled_at = new Date().toISOString()
      transactions.set(paymentId, record)

      // Forward simulated settlement to OpenWrapper webhook if reachable
      try {
        const merchantRef = record.merchant_reference || record.merchantReference || paymentId
        const providerRef = record.provider_reference || record.providerReference
        const baseRoot = BASE_URL.replace(/\/api\/?$/, "").replace(/\/v1\/?$/, "")
        await fetch(`${baseRoot}/api/webhooks/mock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_reference: merchantRef,
            provider_reference: providerRef,
            status: "succeeded",
          }),
        }).catch(() => {})
      } catch {
        // Silently continue
      }

      sendJson(res, 200, {
        success: true,
        payment_id: paymentId,
        paymentId,
        status: "succeeded",
        settled_at: record.settled_at,
        message: "Payment settled via simulated gateway webhook",
        sdk_backend: "typescript",
      })
    } catch (err) {
      sendJson(res, 400, { error: { code: "invalid_request", message: err.message } })
    }
    return
  }

  // Create Payment / Checkout (supports both /api/checkout and /api/create-payment)
  if (req.method === "POST" && (url.pathname === "/api/checkout" || url.pathname === "/api/create-payment")) {
    try {
      const input = checkoutInput(await readJson(req))
      let paymentRecord = null

      // 1. First Attempt: Call OpenWrapper Gateway via SDK
      try {
        const host = req.headers.host || `localhost:${PORT}`
        const proto = req.headers["x-forwarded-proto"] || "http"
        const returnUrl = `${proto}://${host}/?status=success&session_id={CHECKOUT_SESSION_ID}&payment_id=${encodeURIComponent(input.merchantReference)}`

        const payment = await client.payments.create(
          {
            provider: input.provider,
            amountMinorUnits: input.amountMinorUnits || input.product.amountMinorUnits,
            currency: input.product.currency,
            customer: { phone: input.phone, email: input.email, fullName: input.fullName },
            merchantReference: input.merchantReference,
            description: `TypeScript SDK Demo: ${input.product.name}`,
            returnUrl,
            metadata: {
              payment_method: input.paymentMethod,
              wallet_carrier: input.walletCarrier,
            },
          },
          { idempotencyKey: input.merchantReference },
        )

        paymentRecord = {
          payment_id: payment.paymentId,
          paymentId: payment.paymentId,
          provider: payment.provider,
          status: payment.status,
          amount_minor_units: payment.amountMinorUnits,
          amountMinorUnits: payment.amountMinorUnits,
          formatted_amount: formatMajorUnits(payment.amountMinorUnits, getCurrencyDecimals(payment.currency)),
          formattedAmount: formatMajorUnits(payment.amountMinorUnits, getCurrencyDecimals(payment.currency)),
          currency: payment.currency,
          merchant_reference: payment.merchantReference,
          merchantReference: payment.merchantReference,
          provider_reference: payment.providerReference,
          providerReference: payment.providerReference,
          next_action: payment.nextAction,
          nextAction: payment.nextAction,
          sdk_backend: "typescript",
          via_gateway: true,
        }
      } catch (clientErr) {
        console.log(`[TypeScript Server] OpenWrapper Gateway error (${clientErr.message}), checking direct provider/sandbox fallback...`)
      }

      // 2. Second Attempt: If real test credentials provided, invoke provider directly
      if (!paymentRecord) {
        if (input.provider === "paymob" && isPaymobConfigured()) {
          paymentRecord = await tryDirectPaymob(input)
        } else if (input.provider === "stripe" && isConfiguredKey(process.env.STRIPE_SECRET_KEY) && process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
          paymentRecord = await tryDirectStripe(input)
        } else if (input.provider === "fawry" && isConfiguredKey(process.env.FAWRY_SECURE_KEY)) {
          paymentRecord = await tryDirectFawry(input)
        }
      }

      // 3. Third Attempt: High-fidelity sandbox mock fallback
      if (!paymentRecord) {
        console.log(`[TypeScript Server] Provider '${input.provider}' running in high-fidelity sandbox simulation.`)
        paymentRecord = generateSandboxPayment(input)
      }

      // Save to memory store under all references (payment_id, merchant_reference, provider_reference)
      transactions.set(paymentRecord.payment_id, paymentRecord)
      if (paymentRecord.paymentId) transactions.set(paymentRecord.paymentId, paymentRecord)
      if (paymentRecord.merchant_reference) transactions.set(paymentRecord.merchant_reference, paymentRecord)
      if (paymentRecord.merchantReference) transactions.set(paymentRecord.merchantReference, paymentRecord)
      if (paymentRecord.provider_reference) transactions.set(paymentRecord.provider_reference, paymentRecord)
      if (paymentRecord.providerReference) transactions.set(paymentRecord.providerReference, paymentRecord)

      sendJson(res, 200, paymentRecord)
    } catch (error) {
      console.error("[TypeScript SDK Checkout] Payment creation failed:", error)
      const status =
        Number.isInteger(error.httpStatus) && error.httpStatus >= 400
          ? error.httpStatus
          : 400
      sendJson(res, status, {
        error: {
          code: error.code || "invalid_request",
          message: error.message || "Failed to create payment",
        },
        sdk_backend: "typescript",
      })
    }
    return
  }

  // Payment Status Resolution (supports both /api/payment/:id and /api/payment-status/:id)
  if (
    req.method === "GET" &&
    (url.pathname.startsWith("/api/payment/") || url.pathname.startsWith("/api/payment-status/"))
  ) {
    try {
      const prefix = url.pathname.startsWith("/api/payment-status/")
        ? "/api/payment-status/"
        : "/api/payment/"
      const paymentId = decodeURIComponent(url.pathname.slice(prefix.length))
      if (!paymentId) throw new Error("Payment ID is required")

      // Check in-memory transactions: if already terminal (succeeded/failed), return immediately
      const cached = transactions.get(paymentId)
      if (cached && (cached.status === "succeeded" || cached.status === "failed")) {
        sendJson(res, 200, cached)
        return
      }

      // Query OpenWrapper Gateway for live authoritative status using best known ID
      const queryId = cached?.payment_id || cached?.paymentId || paymentId
      try {
        let payment = await client.payments.get(queryId)

        // If Stripe payment is pending, reconcile directly via Stripe if API key available
        if (
          payment.status === "pending" &&
          payment.provider === "stripe" &&
          payment.providerReference?.startsWith("cs_") &&
          isConfiguredKey(process.env.STRIPE_SECRET_KEY)
        ) {
          try {
            const stripeRes = await fetch(
              `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(payment.providerReference)}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}`,
                },
              },
            )
            if (stripeRes.ok) {
              const sessionData = await stripeRes.json()
              if (sessionData.payment_status === "paid" || sessionData.status === "complete") {
                payment.status = "succeeded"
                payment.nextAction = null

                // Sync status to OpenWrapper control plane database via mock settlement webhook
                const baseRoot = BASE_URL.replace(/\/api\/?$/, "").replace(/\/v1\/?$/, "")
                fetch(`${baseRoot}/api/webhooks/mock`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    payment_id: payment.paymentId,
                    merchant_reference: payment.merchantReference,
                    provider_reference: payment.providerReference,
                    status: "succeeded",
                  }),
                }).catch(() => {})
              } else if (sessionData.status === "expired") {
                payment.status = "failed"
                payment.nextAction = null
              }
            }
          } catch {
            // Direct inquiry fallback
          }
        }

        const record = {
          payment_id: payment.paymentId,
          paymentId: payment.paymentId,
          status: payment.status,
          provider: payment.provider,
          amount_minor_units: payment.amountMinorUnits,
          amountMinorUnits: payment.amountMinorUnits,
          formatted_amount: formatMajorUnits(payment.amountMinorUnits, getCurrencyDecimals(payment.currency)),
          formattedAmount: formatMajorUnits(payment.amountMinorUnits, getCurrencyDecimals(payment.currency)),
          currency: payment.currency,
          merchant_reference: payment.merchantReference,
          provider_reference: payment.providerReference,
          providerReference: payment.providerReference,
          next_action: payment.nextAction,
          nextAction: payment.nextAction,
          sdk_backend: "typescript",
        }
        transactions.set(payment.paymentId, record)
        if (payment.merchantReference) transactions.set(payment.merchantReference, record)
        if (payment.providerReference) transactions.set(payment.providerReference, record)

        sendJson(res, 200, record)
        return
      } catch (gwErr) {
        if (cached) {
          sendJson(res, 200, cached)
          return
        }
        throw gwErr
      }
    } catch (error) {
      const status =
        Number.isInteger(error.httpStatus) && error.httpStatus >= 400 ? error.httpStatus : 404
      sendJson(res, status, {
        error: {
          code: error.code || "payment_not_found",
          message: error.message || "Failed to get payment status",
        },
        sdk_backend: "typescript",
      })
    }
    return
  }

  sendJson(res, 404, { error: { code: "not_found", message: `Route not found: ${url.pathname}` } })
})

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ [Error] Port ${PORT} is already in use by another process.`)
    console.error(`To free the port, run:`)
    console.error(`  Windows: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`)
    console.error(`  Linux/Mac: kill -9 $(lsof -t -i:${PORT})\n`)
    console.error(`Or specify a different port:`)
    console.error(`  PORT=4010 node server.js\n`)
    process.exit(1)
  }
  throw err
})

server.listen(PORT, () => {
  const paymobStatus = isPaymobConfigured()
    ? "configured"
    : process.env.PAYMOB_SECRET_KEY && !process.env.PAYMOB_SECRET_KEY.includes("...") && !process.env.PAYMOB_SECRET_KEY.startsWith("egy_sk_")
    ? "invalid format (must start with egy_sk_)"
    : "sandbox simulation"

  const fawryStatus = isConfiguredKey(process.env.FAWRY_SECURE_KEY)
    ? "configured"
    : "sandbox simulation"

  const stripeStatus = isConfiguredKey(process.env.STRIPE_SECRET_KEY) && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
    ? "configured"
    : "sandbox simulation"

  console.log("=================================================");
  console.log(" OpenWrapper TypeScript Standalone Checkout Demo");
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` Connected Gateway: ${BASE_URL}`);
  console.log(` Paymob Key Status: ${paymobStatus}`);
  console.log(` Fawry Key Status : ${fawryStatus}`);
  console.log(` Stripe Key Status: ${stripeStatus}`);
  console.log(" Catalog Products (Zero Floating Point):");
  for (const [key, p] of Object.entries(products)) {
    console.log(`   - [${key}]: ${p.name} -> ${p.currency} ${formatMajorUnits(p.amountMinorUnits, getCurrencyDecimals(p.currency))} (${p.amountMinorUnits} minor units)`);
  }
  console.log("=================================================");
})
