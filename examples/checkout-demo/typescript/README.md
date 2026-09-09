# OpenWrapper TypeScript / Node.js Checkout Demo

Standalone Node.js backend server and CLI transaction test runner implementing `@openwrapper/sdk`.

---

## Running the TypeScript Server (Port 4000)

```bash
# From examples/checkout-demo:
pnpm run start:ts
# or
node typescript/server.js
```

Open browser at: **[http://localhost:4000](http://localhost:4000)**

---

## Running the CLI Tester

```bash
pnpm run test:cli:ts
# or
node typescript/test-cli.js
```

---

## TypeScript SDK Code Example

```typescript
import { OpenWrapperClient, formatMajorUnits, toMinorUnits } from "@openwrapper/sdk"

const client = new OpenWrapperClient({
  baseUrl: "https://gateway.openwrapper.muejam.com",
  apiKey: process.env.OPENWRAPPER_API_KEY,
})

// Convert decimal major currency amount to integer minor units (Invariant I1 - Zero Floating Point)
const amountMinorUnits = toMinorUnits("150.00", 2) // 15000 minor units

const payment = await client.payments.create({
  provider: "paymob", // or "fawry", "stripe", "mock"
  amountMinorUnits,
  currency: "EGP",
  customer: {
    phone: "+201001234567",
    email: "customer@example.com",
    fullName: "Ahmed Ali",
  },
  merchantReference: "order_1001",
  description: "TypeScript Storefront Demo",
}, {
  idempotencyKey: "order_1001",
})

// Format discrete integer minor units back to human display string (e.g. "150.00")
const displayAmount = formatMajorUnits(payment.amountMinorUnits, 2)
console.log(`Payment ID: ${payment.paymentId} (Amount: ${payment.currency} ${displayAmount}) [${payment.status}]`)

if (payment.nextAction?.url) {
  console.log(`Redirect: ${payment.nextAction.url}`)
}
```
