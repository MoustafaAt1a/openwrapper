# 🛒 OpenWrapper Multi-SDK Real-World Checkout Demo

A standalone, modern, and production-grade e-commerce checkout showcase demonstrating real transaction processing across all three official OpenWrapper SDKs:

- ⚡ **TypeScript / Node.js SDK** (`@openwrapper/sdk`) on port `4000`
- 🐘 **PHP 8.1+ Composer SDK** (`openwrapper/sdk`) on port `4001`
- 🔷 **.NET 8 / C# SDK** (`OpenWrapper`) on port `4002`

---

## ✨ Features & Architecture

- **Classic Modern Storefront**: High-end obsidian glassmorphic UI with real-time plan selection, input validation, and interactive provider rails (Paymob, Fawry, Stripe).
- **Live Backend Target Switcher**: Toggle checkout API execution between TypeScript (`:4000`), PHP (`:4001`), and .NET (`:4002`) on the fly with live health indicator pings.
- **Dynamic Idiomatic SDK Inspector**: Side-by-side tabs showcasing real-time code generation for TypeScript, PHP, and C# matching the exact values entered in the checkout form.
- **Real-Time Payment Resolution**:
  - **Paymob / Stripe**: Direct button to launch the 3D-secure hosted checkout portal (`next_action.url`).
  - **Fawry**: Visual payment kiosk voucher card displaying the reference code (`next_action.reference`), 48-hour validity notice, and payment steps.
  - **Status Poller**: Automatic status resolution polling (`/api/payment-status/:id`) with latency measurements.
- **Zero-Storage Security Guarantee**: Merchant API keys remain strictly on the backend; only ephemeral encrypted headers are transmitted to the gateway.

---

## 🚀 Quickstart

### 1. Environment Configuration

Copy `.env.example` in `examples/checkout-demo/` to `.env`:

```bash
cd examples/checkout-demo
cp .env.example .env
```

Configure your gateway URL and test provider credentials:

```env
OPENWRAPPER_BASE_URL=https://gateway.openwrapper.muejam.com
OPENWRAPPER_API_KEY=ow_live_your_api_key_here

# Provider Credentials
PAYMOB_SECRET_KEY=egy_sk_...
PAYMOB_PUBLIC_KEY=egy_pk_...
PAYMOB_INTEGRATION_ID=123456
FAWRY_MERCHANT_CODE=1013970
FAWRY_SECURE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 🖥️ Running the Checkout Servers

You can run any or all of the backend servers simultaneously. The web UI served on any port allows switching the active backend target to any running server:

### A. TypeScript / Node.js Server (Port 4000)

```bash
# Using bun or npm:
bun run start:ts
# or
node server.js
```
👉 Accessible at: **[http://localhost:4000](http://localhost:4000)**

### B. PHP 8 Server (Port 4001)

```bash
bun run start:php
# or directly:
php -S 0.0.0.0:4001 php/server.php
```
👉 Accessible at: **[http://localhost:4001](http://localhost:4001)**

### C. .NET 8 / ASP.NET Core Server (Port 4002)

```bash
bun run start:dotnet
# or directly:
dotnet run --project dotnet/CheckoutDemo.csproj
```
👉 Accessible at: **[http://localhost:4002](http://localhost:4002)**

---

## 🧪 CLI Real Transaction Testers

Each SDK includes an automated terminal test runner that performs:
1. Live payment creation with integer minor units
2. Extraction of next action (redirect URL or Fawry reference code)
3. Direct verification lookup via `getPayment(id)`

```bash
# TypeScript CLI
bun run test:cli:ts

# PHP CLI
bun run test:cli:php

# .NET CLI
bun run test:cli:dotnet
```

To test a specific payment rail (e.g., Fawry or Stripe), set `OPENWRAPPER_TEST_PROVIDER`:

```bash
OPENWRAPPER_TEST_PROVIDER=fawry bun run test:cli:php
OPENWRAPPER_TEST_PROVIDER=stripe bun run test:cli:dotnet
```

---

## 💻 Idiomatic SDK Code Examples

### TypeScript (`@openwrapper/sdk`)

```typescript
import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "https://gateway.openwrapper.muejam.com",
  apiKey: process.env.OPENWRAPPER_API_KEY,
});

const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 15000, // EGP 150.00
  currency: "EGP",
  customer: {
    phone: "+201001234567",
    email: "ahmed@example.com",
    fullName: "Ahmed Ali",
  },
  merchantReference: "order_1001",
  description: "Pro Developer Plan",
}, { idempotencyKey: "order_1001" });
```

### PHP (`openwrapper/sdk`)

```php
use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: 'https://gateway.openwrapper.muejam.com',
    apiKey: getenv('OPENWRAPPER_API_KEY'),
);

$payment = $client->createPayment(new CreatePaymentParams(
    provider: 'fawry',
    amountMinorUnits: 15000, // EGP 150.00
    currency: 'EGP',
    customer: new CustomerDetails(
        phone: '+201001234567',
        email: 'ahmed@example.com',
        fullName: 'Ahmed Ali'
    ),
    merchantReference: 'order_1002',
    description: 'Pro Developer Plan'
), idempotencyKey: 'order_1002');
```

### .NET 8 / C# (`OpenWrapper`)

```csharp
using OpenWrapper;
using OpenWrapper.Models;

await using var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = "https://gateway.openwrapper.muejam.com",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
});

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "stripe",
    AmountMinorUnits = 15000, // EGP 150.00
    Currency = "EGP",
    Customer = new CustomerDetails
    {
        Phone = "+201001234567",
        Email = "ahmed@example.com",
        FullName = "Ahmed Ali",
    },
    MerchantReference = "order_1003",
    Description = "Pro Developer Plan",
}, idempotencyKey: "order_1003");
```

---

## 🛡️ License

MIT License • OpenWrapper Project
