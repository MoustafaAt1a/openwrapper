import http from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { OpenWrapperClient } from "../../sdk/typescript/dist/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "public")

// Load .env file manually without external dotenv dependency
function loadEnv() {
  const envPath = join(__dirname, ".env")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}
loadEnv()

const PORT = Number(process.env.PORT) || 4000
const BASE_URL = process.env.OPENWRAPPER_BASE_URL || "https://web-production-884cd.up.railway.app"
const API_KEY = process.env.OPENWRAPPER_API_KEY || "ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr"

// Initialize OpenWrapper TypeScript SDK
const client = new OpenWrapperClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secureKey: process.env.FAWRY_SECURE_KEY,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  },
})

// HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`)

  // 1. Serve Static Files
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = readFileSync(join(publicDir, "index.html"), "utf-8")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(html)
    return
  }

  if (req.method === "GET" && url.pathname === "/style.css") {
    const css = readFileSync(join(publicDir, "style.css"), "utf-8")
    res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" })
    res.end(css)
    return
  }

  if (req.method === "GET" && url.pathname === "/app.js") {
    const js = readFileSync(join(publicDir, "app.js"), "utf-8")
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" })
    res.end(js)
    return
  }

  // 2. API Endpoint: POST /api/create-payment (Uses TypeScript SDK)
  if (req.method === "POST" && url.pathname === "/api/create-payment") {
    let raw = ""
    req.on("data", (chunk) => (raw += chunk))
    req.on("end", async () => {
      try {
        const body = JSON.parse(raw)
        console.log(`[SDK Checkout] Creating payment with provider: ${body.provider}...`)

        // Invoke TypeScript SDK
        const payment = await client.payments.create({
          provider: body.provider,
          amountMinorUnits: body.amount_minor_units || 15000,
          currency: body.currency || "EGP",
          customer: {
            phone: body.customer?.phone || "+201000000000",
            email: body.customer?.email,
            fullName: body.customer?.full_name,
          },
          merchantReference: body.merchant_reference || `ord_${Date.now()}`,
          description: body.description || "Checkout Order",
        })

        console.log(`[SDK Checkout] Success! Payment ID: ${payment.paymentId}, Status: ${payment.status}`)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(payment))
      } catch (err) {
        console.error("[SDK Checkout] Error:", err)
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: err.message || "Failed to create payment" }))
      }
    })
    return
  }

  // 3. API Endpoint: GET /api/payment/:id (Uses TypeScript SDK)
  if (req.method === "GET" && url.pathname.startsWith("/api/payment/")) {
    const paymentId = url.pathname.replace("/api/payment/", "")
    try {
      const payment = await client.payments.get(paymentId)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(payment))
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // 404 Not Found
  res.writeHead(404, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not Found" }))
})

server.listen(PORT, () => {
  console.log(`\n======================================================`)
  console.log(`🚀 OpenWrapper Standalone Checkout Demo is RUNNING!`)
  console.log(`👉 Open in browser: http://localhost:${PORT}`)
  console.log(`🔗 Connected Gateway: ${BASE_URL}`)
  console.log(`🔑 Using API Key: ${API_KEY.slice(0, 15)}...`)
  console.log(`======================================================\n`)
})
