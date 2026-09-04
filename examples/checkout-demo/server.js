import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import http from "node:http"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { OpenWrapperClient } from "@openwrapper/sdk"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "public")
const MAX_REQUEST_BYTES = 16 * 1024

const products = Object.freeze({
  starter: { name: "Starter Developer Tier", amountMinorUnits: 5000, currency: "EGP" },
  pro: { name: "OpenWrapper Pro Plan", amountMinorUnits: 15000, currency: "EGP" },
  enterprise: { name: "Enterprise Gateway License", amountMinorUnits: 45000, currency: "EGP" },
})

const providers = new Set(["paymob", "fawry", "stripe"])

function loadEnv() {
  const envFiles = [join(__dirname, ".env"), join(__dirname, "..", ".env")]
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

const PORT = Number(process.env.PORT) || 4000
const BASE_URL = process.env.OPENWRAPPER_BASE_URL || "http://localhost:3000/api"
const API_KEY = process.env.OPENWRAPPER_API_KEY || undefined

const client = new OpenWrapperClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
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
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
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
        const error = new Error("Request body exceeds 16 KiB")
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

  const phone = typeof body.customer?.phone === "string" ? body.customer.phone.trim() : ""
  const email =
    typeof body.customer?.email === "string" ? body.customer.email.trim() : undefined
  const fullName =
    typeof (body.customer?.full_name || body.customer?.fullName) === "string"
      ? (body.customer.full_name || body.customer.fullName).trim()
      : undefined

  if (!phone) throw new Error("Customer phone is required")
  if (phone.length > 64 || (email?.length ?? 0) > 254 || (fullName?.length ?? 0) > 200) {
    throw new Error("Customer details exceed allowed lengths")
  }

  const merchantReference =
    typeof (body.merchant_reference || body.merchantReference) === "string" &&
    /^[!#-~]{1,200}$/.test(body.merchant_reference || body.merchantReference)
      ? (body.merchant_reference || body.merchantReference)
      : `ts_order_${randomUUID().replace(/-/g, "").slice(0, 16)}`

  return { product, provider, phone, email, fullName, merchantReference }
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
      version: "0.1.2",
      server: "OpenWrapper TypeScript Standalone Demo",
      port: PORT,
      gateway: BASE_URL,
    })
    return
  }

  // Static Assets
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

  // Create Payment / Checkout (supports both /api/checkout and /api/create-payment)
  if (req.method === "POST" && (url.pathname === "/api/checkout" || url.pathname === "/api/create-payment")) {
    try {
      const input = checkoutInput(await readJson(req))
      const payment = await client.payments.create(
        {
          provider: input.provider,
          amountMinorUnits: input.product.amountMinorUnits,
          currency: input.product.currency,
          customer: { phone: input.phone, email: input.email, fullName: input.fullName },
          merchantReference: input.merchantReference,
          description: `TypeScript SDK Demo: ${input.product.name}`,
        },
        { idempotencyKey: input.merchantReference },
      )

      sendJson(res, 200, {
        payment_id: payment.paymentId,
        paymentId: payment.paymentId,
        provider: payment.provider,
        status: payment.status,
        amount_minor_units: payment.amountMinorUnits,
        amountMinorUnits: payment.amountMinorUnits,
        currency: payment.currency,
        merchant_reference: payment.merchantReference,
        merchantReference: payment.merchantReference,
        provider_reference: payment.providerReference,
        providerReference: payment.providerReference,
        next_action: payment.nextAction,
        nextAction: payment.nextAction,
        sdk_backend: "typescript",
      })
    } catch (error) {
      console.error("[TypeScript SDK Checkout] Payment creation failed:", error)
      const status =
        Number.isInteger(error.httpStatus) && error.httpStatus >= 400
          ? error.httpStatus
          : error.code === "gateway_unreachable" || error.code === "gateway_timeout"
            ? 502
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
      const payment = await client.payments.get(paymentId)

      sendJson(res, 200, {
        payment_id: payment.paymentId,
        paymentId: payment.paymentId,
        status: payment.status,
        provider: payment.provider,
        amount_minor_units: payment.amountMinorUnits,
        amountMinorUnits: payment.amountMinorUnits,
        currency: payment.currency,
        merchant_reference: payment.merchantReference,
        provider_reference: payment.providerReference,
        providerReference: payment.providerReference,
        next_action: payment.nextAction,
        nextAction: payment.nextAction,
        sdk_backend: "typescript",
      })
    } catch (error) {
      const status =
        Number.isInteger(error.httpStatus) && error.httpStatus >= 400 ? error.httpStatus : 502
      sendJson(res, status, {
        error: {
          code: error.code || "gateway_error",
          message: error.message || "Failed to get payment",
        },
        sdk_backend: "typescript",
      })
    }
    return
  }

  sendJson(res, 404, { error: { code: "not_found", message: `Route not found: ${url.pathname}` } })
})

server.listen(PORT, () => {
  console.log("=================================================");
  console.log(" OpenWrapper TypeScript Standalone Checkout Demo");
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` Connected Gateway: ${BASE_URL}`);
  console.log(` API Auth Key     : ${API_KEY ? "configured" : "not configured"}`);
  console.log("=================================================");
})
