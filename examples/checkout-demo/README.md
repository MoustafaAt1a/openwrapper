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
 
| Command (Make) | Command (Just) | Direct Command | Description | Port |
| :--- | :--- | :--- | :--- | :---: |
| `make start` | `just start` | `node scripts/start-all.mjs` | Start **ALL 3** servers concurrently (:4000, :4001, :4002) | All |
| `make start-ts` | `just start-ts` | `cd typescript && node server.js` | Start TypeScript / Node.js server | `:4000` |
| `make start-php` | `just start-php` | `cd php && php server.php` | Start PHP 8 built-in server | `:4001` |
| `make start-dotnet` | `just start-dotnet` | `dotnet run --project dotnet/CheckoutDemo.csproj` | Start .NET 8 / ASP.NET Core server | `:4002` |

Web UI accessible at:
- **[http://localhost:4000](http://localhost:4000)** (TypeScript SDK)
- **[http://localhost:4001](http://localhost:4001)** (PHP 8 SDK)
- **[http://localhost:4002](http://localhost:4002)** (.NET 8 SDK)

> [!NOTE]
> **PHP 8 Development Server Notes**:
> - Running `php server.php` directly from `examples/checkout-demo/php` automatically configures `php.ini` with cURL/OpenSSL extensions and launches the built-in server on `http://0.0.0.0:4001`.
> - Alternatively, running `php -c php.ini -S 0.0.0.0:4001 server.php` uses `server.php` as the request router.
> - PHP's built-in web server displays `[time] <ip>:<port> Accepted` and `Closing` for incoming TCP connections. Empty connections (such as browser socket pre-connects, TCP port scanners, or keep-alive polls) connect and close immediately; legitimate HTTP requests will output `[PHP Server] <METHOD> <PATH> -> <STATUS>` accompanied by the startup status banner.

### Running Multi-Rail CLI Testers

| Command (Make) | Command (Just) | Direct Command | Description |
| :--- | :--- | :--- | :--- |
| `make test-all` | `just test-all` | `make test-all` | Run multi-rail CLI tests across all 3 SDKs |
| `make test-cli-ts` | `just test-cli-ts` | `node typescript/test-cli.js` | Run TypeScript CLI multi-rail tester (Cards, Wallets, Kiosks, Stripe) |
| `make test-cli-php` | `just test-cli-php` | `php php/test-cli.php` | Run PHP CLI multi-rail tester (Cards, Wallets, Kiosks, Stripe) |
| `make test-cli-dotnet` | `just test-cli-dotnet` | `dotnet run --project dotnet/CheckoutDemo.csproj -- --cli` | Run .NET CLI multi-rail tester (Cards, Wallets, Kiosks, Stripe) |

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
