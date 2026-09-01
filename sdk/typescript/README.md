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
| Next.js web API (Stripe + gateway proxy) | `http://localhost:3000/api/v1` |

Paths `/v1/payments` are appended automatically.

## Stateless credentials

Pass provider secrets per-request via the `providers` option (sent as `X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*` headers). OpenWrapper never stores merchant provider keys.

## License

Apache-2.0
