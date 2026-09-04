# OpenWrapper Multi-SDK Real-World Checkout Demo

A production-grade, standalone checkout showcase implementing real transaction processing across all three official OpenWrapper SDKs, designed strictly according to the OpenWrapper Design System ([`docs/DESIGN.md`](../../docs/DESIGN.md)):

```
examples/checkout-demo/
├── Makefile           # GNU Make task runner (make start, make test-all, make check)
├── justfile           # Just task runner (just start, just test-all, just check)
├── typescript/        # TypeScript SDK backend (:4000), CLI tester & package.json
├── php/               # PHP 8.1+ SDK backend (:4001) & CLI tester
├── dotnet/            # .NET 8 / C# SDK backend (:4002) & CLI tester
└── public/            # Shared authentic checkout page (HTML/CSS/JS)
```

---

## Features & Design System Compliance

- **Modern SaaS Checkout (Stripe / Cal.com Aesthetic)**:
  - Clean white canvas (`#ffffff`) with soft surfaces (`#f8f9fa`) and hairline borders (`#e5e7eb`).
  - Dominant action CTA in near-black (`#111111`) with 8px border radius (`rounded.md`).
  - Dark footer (`#101010`) visually closing the page.
  - Realistic order summary breakdown: line items, plan switching, integer minor units, and security guarantees.
- **4 Real-World Payment Method Rails**:
  1. **Credit & Debit Cards**: Visa, Mastercard, and Egyptian Meeza with Luhn formatting, brand detection, and 3D-Secure hosted authentication.
  2. **Egyptian Mobile Wallets**: Direct carrier selection (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay, InstaPay) with phone number auto-sync and Paymob wallet intention dispatch.
  3. **Fawry Retail POS Kiosk**: Generates authentic 9-digit payment reference numbers (`929...`) with simulated barcode and 48-hour cash settlement instructions.
  4. **International & Digital Wallets**: Seamless Stripe Checkout portal for global cards, Apple Pay, and Google Pay.
- **Interactive Sandbox Testing**:
  - Live auto-sync for Paymob 3DS cards, Meeza debit, Stripe test cards, and Egyptian wallet carriers with live visual feedback.
- **Simulated Webhook Settlement Engine**:
  - Live `[Simulate Settlement (Webhook)]` action in the result card.
  - Triggers `POST /api/simulate-settlement` across TypeScript, PHP, and .NET.
  - Seamlessly transitions payments from `PENDING` -> `SUCCEEDED` live, updating the reactive poller and ledger without leaving the browser.
- **Multi-Runtime Backend Target Switcher**:
  - Pill-in-pill selector (`nav-pill-group`) toggling requests between:
    - **TypeScript / Node.js** on port `4000`
    - **PHP 8.1+** on port `4001`
    - **.NET 8 / ASP.NET Core** on port `4002`
  - Real-time heartbeat probes displaying active connectivity.
- **Developer Inspection Drawer**:
  - Dynamic idiomatic code generation for TypeScript, PHP 8, and C# reacting in real-time to active payment rail and inputs.
  - Collapsible raw gateway JSON payload viewer.

---

## Quickstart

### 1. Environment Configuration

Copy `.env.example` in `examples/checkout-demo/` to `.env`:

```bash
cd examples/checkout-demo
cp .env.example .env
```

Configure your gateway URL and test provider credentials:

```env
OPENWRAPPER_BASE_URL=http://localhost:3000/api
OPENWRAPPER_API_KEY=ow_live_your_api_key_here

# Provider Credentials (Insert your test API keys here)
PAYMOB_SECRET_KEY=egy_sk_test_...
PAYMOB_PUBLIC_KEY=egy_pk_test_...
PAYMOB_HMAC_SECRET=...
PAYMOB_INTEGRATION_ID=...
PAYMOB_WALLET_INTEGRATION_ID=...

FAWRY_MERCHANT_CODE=1013970
FAWRY_SECURE_KEY=...

STRIPE_SECRET_KEY=sk_test_...
```

> [!TIP]
> If real test credentials are provided in `.env`, the demo servers seamlessly route requests to real Paymob/Fawry/Stripe APIs. If run without credentials, the high-fidelity sandbox engine automatically handles all 4 payment rails!

---

## Running with Makefile or Justfile

You can manage and run everything using standard `make` or `just` commands:

### Running Servers

| Command (Make) | Command (Just) | Description | Port |
| :--- | :--- | :--- | :---: |
| `make start` | `just start` | Start **ALL 3** servers concurrently (:4000, :4001, :4002) | All |
| `make start-ts` | `just start-ts` | Start TypeScript / Node.js server | `:4000` |
| `make start-php` | `just start-php` | Start PHP 8 built-in server | `:4001` |
| `make start-dotnet` | `just start-dotnet` | Start .NET 8 / ASP.NET Core server | `:4002` |

Web UI accessible at:
- **[http://localhost:4000](http://localhost:4000)** (TypeScript)
- **[http://localhost:4001](http://localhost:4001)** (PHP)
- **[http://localhost:4002](http://localhost:4002)** (.NET)

### Running Multi-Rail CLI Testers

| Command (Make) | Command (Just) | Description |
| :--- | :--- | :--- |
| `make test-all` | `just test-all` | Run multi-rail CLI tests across all 3 SDKs |
| `make test-cli-ts` | `just test-cli-ts` | Run TypeScript CLI multi-rail tester (Cards, Wallets, Kiosks) |
| `make test-cli-php` | `just test-cli-php` | Run PHP CLI multi-rail tester (Cards, Wallets, Kiosks) |
| `make test-cli-dotnet` | `just test-cli-dotnet` | Run .NET CLI multi-rail tester (Cards, Wallets, Kiosks) |

### Verification & Dependencies

```bash
# Verify syntax and build across all 3 SDKs:
make check      # or: just check

# Run end-to-end API verification:
node scripts/verify-api.mjs

# Install / restore dependencies:
make install    # or: just install
```

---

## License

MIT License • OpenWrapper Project
