# @openwrapper/sdk (TypeScript / Node.js / Browser)

[![Version](https://img.shields.io/badge/version-0.2.0-emerald.svg)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Official, zero-dependency TypeScript client for the **[OpenWrapper](https://github.com/MoustafaAt1a/openwrapper)** multi-rail payment gateway platform.

- **Zero-Dependency**: Built on native runtime `fetch` (Node.js 18+, Deno, Cloudflare Workers, modern browsers).
- **Simple & Minimalist**: Ready out-of-the-box with sensible defaults (`new OpenWrapperClient()`).
- **Safe Integer Currency Math**: Guaranteed zero floating-point arithmetic errors (`toMinorUnits` / `formatMajorUnits`).
- **Outbound Webhook Verification**: Constant-time HMAC-SHA256 signature verification helper.
- **Full Refunds & Events API**: First-class support for full & partial reversals and immutable event streams.

---

## Installation

```bash
pnpm add @openwrapper/sdk
# or
npm install @openwrapper/sdk
```

---

## 30-Second Quickstart

```typescript
import { OpenWrapperClient } from "@openwrapper/sdk"

// Reads OPENWRAPPER_BASE_URL and OPENWRAPPER_API_KEY from environment automatically:
const client = new OpenWrapperClient()

// 1. Create a payment
const payment = await client.createPayment({
  provider: "paymob",
  amountMinorUnits: 10000, // 100.00 EGP
  currency: "EGP",
  customer: { phone: "+201012345678" },
})

console.log(`Payment created: ${payment.paymentId} [${payment.status}]`)
```

---

## Core Features

### 1. Issuing Full & Partial Refunds

```typescript
// Simple 1-line numeric refund:
const refund = await client.createRefund(payment.paymentId, 5000) // 50.00 EGP

// Or with optional reason and idempotency key:
const refundWithReason = await client.refunds.create(
  payment.paymentId,
  { amountMinorUnits: 5000, reason: "customer_requested" },
  { idempotencyKey: "refund-order-1001-attempt-1" },
)

// List all refunds for a payment:
const allRefunds = await client.listRefunds(payment.paymentId)
```

### 2. Verifying Inbound Webhooks

Verify that incoming webhooks are genuinely from OpenWrapper and prevent timing attacks:

```typescript
import { webhooks } from "@openwrapper/sdk"

app.post("/webhook", async (req, res) => {
  const signature = req.headers["x-openwrapper-signature"]
  const secret = process.env.OPENWRAPPER_WEBHOOK_SECRET!

  const isValid = webhooks.verifySignature(req.rawBody, signature, secret)
  if (!isValid) {
    return res.status(401).send("Invalid signature")
  }

  const event = JSON.parse(req.rawBody)
  console.log(`Received verified event: ${event.event_type}`)
  res.sendStatus(200)
})
```

### 3. Safe Currency Minor-Unit Conversion

Avoid JavaScript floating-point errors (e.g. `0.1 + 0.2 === 0.30000000000000004`):

```typescript
import { toMinorUnits, formatMajorUnits } from "@openwrapper/sdk"

// Convert dollars/EGP to integer minor units:
const minor = toMinorUnits("25.99") // 2599
const jpy = toMinorUnits(1500, 0) // 1500 (zero-decimal)

// Format minor units for display:
const display = formatMajorUnits(2599) // "25.99"
```

### 4. Querying the Immutable Events Ledger

```typescript
const events = await client.listEvents({ limit: 10 })
for (const event of events.data) {
  console.log(`[${event.eventType}] on ${event.resourceId} at ${event.createdAt}`)
}
```

---

## Client Configuration

```typescript
const client = new OpenWrapperClient({
  baseUrl: "https://gateway.example.com", // default: http://127.0.0.1:8080
  apiKey: "ow_live_...",
  maxRetries: 2, // automatic backoff retry on network errors
  timeoutMs: 15_000, // 15s deadline per request
  providers: {
    // Optional Stateless Zero-Knowledge Mode (passes keys per-request via TLS headers)
    paymob: { secretKey: "...", publicKey: "...", integrationId: "..." },
    fawry: { merchantCode: "...", secureKey: "..." },
    stripe: { secretKey: "..." },
  },
})
```

---

## Error Handling

The SDK maps all gateway responses into strongly typed exceptions:

```typescript
import {
  IdempotencyConflictError,
  ValidationError,
  RateLimitError,
  GatewayTimeoutError,
  GatewayUnreachableError,
} from "@openwrapper/sdk"

try {
  await client.createPayment(params)
} catch (err) {
  if (err instanceof IdempotencyConflictError) {
    console.error("Idempotency key was reused with different payload")
  } else if (err instanceof ValidationError) {
    console.error(`Invalid input: ${err.message}`)
  } else if (err instanceof RateLimitError) {
    console.error("Rate limit exceeded, please slow down")
  } else if (err instanceof GatewayTimeoutError) {
    console.error("Gateway timed out contacting payment rail")
  } else if (err instanceof GatewayUnreachableError) {
    console.error("Network failure contacting OpenWrapper gateway")
  }
}
```

---

## License

Apache-2.0 © OpenWrapper Contributors
