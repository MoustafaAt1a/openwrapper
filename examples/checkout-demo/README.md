# 🛒 OpenWrapper Standalone Real-World Checkout Demo

A standalone, minimal, and fully-working e-commerce checkout application demonstrating the `@openwrapper/sdk` (TypeScript SDK) connected to the OpenWrapper Gateway.

---

## 🚀 Features
- **Real Checkout Page**: Modern, responsive checkout UI with plan details and customer input fields.
- **Multi-Gateway Payment Selection**:
  - **Paymob**: Cards & Mobile Wallets with direct checkout URL redirection.
  - **Fawry**: Pay-at-kiosk reference code generation with validity instructions.
  - **Stripe**: Global card checkout session.
- **Live Status Poller**: Interactive button to check real-time transaction resolution via SDK `client.payments.get(id)`.
- **Zero Heavy Frameworks**: Pure standalone Node.js server with zero external backend dependencies.

---

## 📦 How to Run

### 1. Configure and start the demo

Copy `.env.example` to `.env`, set `OPENWRAPPER_API_KEY` and the credentials
for each provider you enable, then install and start:

```bash
cd examples/checkout-demo
npm install
npm start
```

Provider credentials stay on this Node.js backend; they are never sent to the
browser. Product IDs and prices are also resolved server-side rather than
trusted from checkout JSON.

Open your browser at:
👉 **[http://localhost:4000](http://localhost:4000)**

---

### 2. Run the live CLI check

This command creates real provider payment attempts and requires configured
credentials. It exits non-zero if any requested provider fails. Limit providers
with `OPENWRAPPER_TEST_PROVIDERS=paymob,fawry`:
```bash
npm run test:cli
```

---

## 💻 SDK Code Example Used in this Demo

```ts
import { OpenWrapperClient } from "@openwrapper/sdk"

// 1. Initialize the SDK
const client = new OpenWrapperClient({
  baseUrl: "http://localhost:3000/api",
  apiKey: process.env.OPENWRAPPER_API_KEY, // "ow_live_..."
})

// 2. Create a Payment
const payment = await client.payments.create({
  provider: "paymob", // or "fawry", "stripe"
  amountMinorUnits: 15000, // EGP 150.00
  currency: "EGP",
  customer: {
    phone: "+201001234567",
    email: "customer@example.com",
    fullName: "Ahmed Ali",
  },
  merchantReference: "order_1001",
  description: "Pro Subscription Order",
}, {
  idempotencyKey: "order_1001",
})

console.log("Payment Created:", payment.paymentId)
if (payment.nextAction?.type === "redirect_to_url") {
  console.log("Redirect Customer to:", payment.nextAction.url)
} else if (payment.nextAction?.type === "pay_at_reference") {
  console.log("Fawry Payment Code:", payment.nextAction.reference)
}

// 3. Retrieve Payment Status
const status = await client.payments.get(payment.paymentId)
console.log("Status:", status.status)
```
