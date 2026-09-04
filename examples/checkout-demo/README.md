# 🛒 OpenWrapper Multi-SDK Real-World Checkout Demo

A production-grade, standalone checkout showcase implementing real transaction processing across all three official OpenWrapper SDKs, designed strictly according to the OpenWrapper Design System ([`docs/DESIGN.md`](../../docs/DESIGN.md)):

```
examples/checkout-demo/
├── typescript/        # ⚡ TypeScript SDK backend (:4000) & CLI tester
├── php/               # 🐘 PHP 8.1+ SDK backend (:4001) & CLI tester
├── dotnet/            # 🔷 .NET 8 / C# SDK backend (:4002) & CLI tester
└── public/            # 🎨 Shared authentic checkout page (HTML/CSS/JS)
```

---

## ✨ Features & Design System Compliance

- **Modern SaaS Checkout (Stripe / Cal.com Aesthetic)**:
  - Clean white canvas (`#ffffff`) with soft surfaces (`#f8f9fa`) and hairline borders (`#e5e7eb`).
  - Dominant action CTA in near-black (`#111111`) with 8px border radius (`rounded.md`).
  - Dark footer (`#101010`) visually closing the page.
  - Realistic order summary breakdown: line items, plan switching, minor units calculation, and security guarantees.
- **Multi-Runtime Backend Target Switcher**:
  - Pill-in-pill selector (`nav-pill-group`) toggling requests between:
    - **TypeScript / Node.js** on port `4000`
    - **PHP 8.1+** on port `4001`
    - **.NET 8 / ASP.NET Core** on port `4002`
  - Real-time heartbeat probes displaying active connectivity.
- **Real Transaction Resolution & Next Actions**:
  - **Paymob / Stripe**: Launches 3D-secure hosted checkout portal (`next_action.url`).
  - **Fawry**: Renders authentic kiosk bill voucher card with 9-digit reference number, barcode graphic, and payment instructions.
  - **Auto-Poller**: Monitors `/api/payment-status/:id` every 3s to update status when settled.
- **Developer Inspection Drawer**:
  - Live idiomatic code generation for TypeScript, PHP 8, and C# reacting in real-time to form inputs.
  - Collapsible raw gateway JSON payload viewer.

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

## 🖥️ Running the Backend Servers

You can start any or all servers independently:

### A. TypeScript / Node.js Server (Port 4000)

```bash
bun run start:ts
# or
node typescript/server.js
```
👉 UI accessible at: **[http://localhost:4000](http://localhost:4000)**

### B. PHP 8 Server (Port 4001)

```bash
bun run start:php
# or
php -S 0.0.0.0:4001 php/server.php
```
👉 UI accessible at: **[http://localhost:4001](http://localhost:4001)**

### C. .NET 8 / ASP.NET Core Server (Port 4002)

```bash
bun run start:dotnet
# or
dotnet run --project dotnet/CheckoutDemo.csproj
```
👉 UI accessible at: **[http://localhost:4002](http://localhost:4002)**

---

## 🧪 CLI Real Transaction Testers

Each SDK folder contains a dedicated CLI test runner that executes real payment creation, extracts next actions, and verifies resolution:

```bash
# TypeScript CLI
bun run test:cli:ts      # runs typescript/test-cli.js

# PHP CLI
bun run test:cli:php     # runs php/test-cli.php

# .NET CLI
bun run test:cli:dotnet  # runs dotnet/CheckoutDemo.csproj -- --cli
```

To target a specific provider (Paymob, Fawry, or Stripe):

```bash
OPENWRAPPER_TEST_PROVIDER=fawry bun run test:cli:php
OPENWRAPPER_TEST_PROVIDER=stripe bun run test:cli:dotnet
```

---

## 🛡️ License

MIT License • OpenWrapper Project
