# 🛒 OpenWrapper Multi-SDK Real-World Checkout Demo

A production-grade, standalone checkout showcase implementing real transaction processing across all three official OpenWrapper SDKs, designed strictly according to the OpenWrapper Design System ([`docs/DESIGN.md`](../../docs/DESIGN.md)):

```
examples/checkout-demo/
├── Makefile           # 🛠️ GNU Make task runner (make start-ts, make check, etc.)
├── justfile           # ⚡ Just task runner (just start-ts, just check, etc.)
├── typescript/        # ⚡ TypeScript SDK backend (:4000), CLI tester & package.json
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

## 🛠️ Running with Makefile or Justfile

You can manage and run everything using standard `make` or `just` commands:

### Running Servers

| Command (Make) | Command (Just) | Description | Port |
| :--- | :--- | :--- | :---: |
| `make start-ts` | `just start-ts` | Start TypeScript / Node.js server | `:4000` |
| `make start-php` | `just start-php` | Start PHP 8 built-in server | `:4001` |
| `make start-dotnet` | `just start-dotnet` | Start .NET 8 / ASP.NET Core server | `:4002` |

👉 Web UI accessible at:
- **[http://localhost:4000](http://localhost:4000)** (TypeScript)
- **[http://localhost:4001](http://localhost:4001)** (PHP)
- **[http://localhost:4002](http://localhost:4002)** (.NET)

### Running CLI Testers

| Command (Make) | Command (Just) | Description |
| :--- | :--- | :--- |
| `make test-cli-ts` | `just test-cli-ts` | Run TypeScript CLI transaction tester |
| `make test-cli-php` | `just test-cli-php` | Run PHP CLI transaction tester |
| `make test-cli-dotnet` | `just test-cli-dotnet` | Run .NET CLI transaction tester |

### Verification & Dependencies

```bash
# Verify syntax and build across all 3 SDKs:
make check      # or: just check

# Install / restore dependencies:
make install    # or: just install
```

---

## 🛡️ License

MIT License • OpenWrapper Project
