# @openwrapper/sdk

TypeScript client for the [OpenWrapper](https://github.com/MoustafaAt1a/openwrapper) payment gateway.

## Install

```bash
npm install @openwrapper/sdk
```

## Quick start

```typescript
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "http://localhost:8080", // Rust gateway
  apiKey: process.env.OPENWRAPPER_API_KEY,
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
    },
  },
});

const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 1000,
  currency: "EGP",
  customer: { phone: "+201234567890" },
});

console.log(payment.status, payment.nextAction);
```

## Base URL

| Deployment | `baseUrl` |
|------------|-----------|
| Rust gateway (recommended for Paymob/Fawry) | `http://localhost:8080` |
| Next.js web API (Stripe + gateway proxy) | `http://localhost:3000/api` |

Paths under `/v1` are appended automatically. For compatibility, a `baseUrl`
already ending in `/v1` (such as `http://localhost:3000/api/v1`) is also
accepted without duplicating the version segment.

## Stateless credentials

Pass provider secrets per-request via the `providers` option (sent as `X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*` headers). OpenWrapper never stores merchant provider keys.

## Idempotency, retries, and cancellation

`create()` generates an idempotency key when one is not supplied. For business
workflows, pass a stable key so an application-level retry identifies the same
logical payment:

```typescript
const controller = new AbortController();
const payment = await client.payments.create(params, {
  idempotencyKey: "order-123-attempt-1",
  signal: controller.signal,
  timeoutMs: 15_000,
});
```

Transport retries are disabled by default. If `maxRetries` is enabled, the SDK
reuses the same idempotency key and never retries an HTTP error response.
Client-side deadline failures throw `GatewayTimeoutError`; explicit aborts
propagate the platform abort error.

## License

Apache-2.0
