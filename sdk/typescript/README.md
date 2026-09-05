# @openwrapper/sdk (TypeScript / Node.js / Bun / Browser)

[![Version](https://img.shields.io/badge/version-0.1.3-emerald.svg)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Official, zero-dependency TypeScript client for the **[OpenWrapper](https://github.com/MoustafaAt1a/openwrapper)** multi-rail payment abstraction platform.

- **Zero-Dependency**: Uses native runtime `fetch` (Node.js 18+, Bun, Deno, modern browsers).
- **Stateless Zero-Knowledge**: Passes merchant provider secrets via encrypted TLS request headers.
- **Strict Integer Minor-Units**: Zero floating-point arithmetic errors.
- **Durable Idempotency**: Automatic UUID key generation or client-specified business keys.

---

## Installation

```bash
npm install @openwrapper/sdk
# or
bun add @openwrapper/sdk
# or
pnpm add @openwrapper/sdk
```

---

## Quickstart

```typescript
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: process.env.OPENWRAPPER_BASE_URL || "http://localhost:8080",
  apiKey: process.env.OPENWRAPPER_API_KEY,
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
});
```

---

## Payment Creation Recipes

### 1. Egyptian Credit/Debit Card (Paymob 3DS)
```typescript
const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 25000, // 250.00 EGP
  currency: "EGP",
  merchantReference: "order-1001",
  customer: {
    phone: "+201012345678",
    email: "customer@example.com",
    fullName: "Omar Tarek",
  },
});

if (payment.status === "requires_action" && payment.nextAction?.url) {
  // Redirect customer to 3DS authentication iframe / page
  console.log("Redirect URL:", payment.nextAction.url);
}
```

### 2. Egyptian Mobile Wallet (Vodafone / Orange / Etisalat / WE Cash)
```typescript
const walletPayment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 15000, // 150.00 EGP
  currency: "EGP",
  merchantReference: "wallet-order-2001",
  customer: {
    phone: "+201010000000", // Customer wallet number
  },
  metadata: {
    channel: "mobile_wallet",
  },
});
```

### 3. Fawry Pay Kiosk Code (Retail Cash Voucher)
```typescript
const fawryPayment = await client.payments.create({
  provider: "fawry",
  amountMinorUnits: 50000, // 500.00 EGP
  currency: "EGP",
  merchantReference: "fawry-ref-3001",
  customer: {
    phone: "+201211112222",
    fullName: "Nouran Aly",
  },
});

// Display 9-digit cash voucher to customer:
const kioskCode = fawryPayment.providerReference;
console.log(`Pay at any Fawry POS terminal using reference code: ${kioskCode}`);
```

### 4. Stripe Hosted Checkout (International Cards & Apple Pay)
```typescript
const stripeSession = await client.payments.create({
  provider: "stripe",
  amountMinorUnits: 4999, // $49.99 USD
  currency: "USD",
  customer: {
    email: "sarah@example.com",
  },
});

console.log("Stripe Checkout URL:", stripeSession.nextAction?.url);
```

---

## Target Base URLs

| Target | `baseUrl` | Notes |
| :--- | :--- | :--- |
| **Rust Gateway (Recommended)** | `http://localhost:8080` | High-throughput Axum daemon with SQLite/Postgres. |
| **Web Console API Proxy** | `http://localhost:3000/api` | Next.js portal proxy routing to gateway. |
| **Production Gateway** | `https://gateway.yourdomain.com` | Production TLS termination endpoint. |

*Note: The SDK automatically appends `/v1`. If your `baseUrl` already ends with `/v1`, it is preserved without duplicating segments.*

---

## Error Handling

The SDK maps all HTTP and network errors into a typed error hierarchy:

```typescript
import {
  OpenWrapperError,
  GatewayTimeoutError,
  AuthenticationError,
  ConflictError,
  InvalidRequestError,
} from "@openwrapper/sdk";

try {
  const payment = await client.payments.create(params, {
    idempotencyKey: "unique-order-uuid-987",
    timeoutMs: 15_000, // 15-second deadline
  });
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Invalid API key:", err.message);
  } else if (err instanceof ConflictError) {
    console.error("Idempotency key reused with different payload:", err.message);
  } else if (err instanceof GatewayTimeoutError) {
    console.error("Upstream payment rail timed out. Query status to reconcile.");
  } else if (err instanceof OpenWrapperError) {
    console.error(`Gateway error (${err.statusCode}):`, err.message);
  }
}
```

---

## Sandbox Testing Cheat Sheet

| Rail | Channel | Test Credentials |
| :--- | :--- | :--- |
| **Paymob** | 3DS Card | `5123 4500 0000 0008` \| Exp: `12/28` \| CVV: `123` \| OTP: `123456` |
| **Paymob** | Meeza Card | `5078 0300 0000 0001` \| Exp: `12/28` \| CVV: `123` \| OTP: `123456` |
| **Paymob** | Mobile Wallet | Phone: `+201010000000` \| OTP: `1234` |
| **Fawry** | Kiosk | Any valid Egyptian mobile number (e.g. `+201012345678`) |
| **Stripe** | 3DS Card | `4242 4242 4242 4242` \| Exp: `12/28` \| CVV: `123` \| OTP: Any 6 digits |

---

## License

Apache-2.0 © OpenWrapper Contributors
