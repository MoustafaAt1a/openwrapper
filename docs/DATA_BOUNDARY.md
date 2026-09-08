# Data boundary

Per §15, this is the data-flow inventory: for every field OpenWrapper
touches, what it receives, forwards, transforms, stores, and logs — and,
just as importantly, what it must never receive at all.

Classification key: **REQUIRED** (must be present to proceed) ·
**OPTIONAL** · **OPAQUE** (never parsed or interpreted, only stored/echoed)
· **SENSITIVE** (PII — handle carefully, minimize retention/logging) ·
**SECRET** (credential material — never logged, never leaves the process
except in an authenticated outbound request) · **FORBIDDEN** (OpenWrapper
must never receive this at all).

## Inbound: client → OpenWrapper (`POST /v1/payments`)

| Field | Class | Received | Forwarded to provider | Stored | Logged |
|---|---|---|---|---|---|
| `provider` | REQUIRED | yes | routing only | yes | yes (provider name only) |
| `amount_minor_units`, `currency` | REQUIRED | yes | yes | yes | amount appears in `tracing::warn!`/`error!` context on transition anomalies (for operator diagnosis), never in routine `info!` logs |
| `customer.phone` | REQUIRED, SENSITIVE | yes | yes (both providers require it) | no — not persisted in the `payments` table; forwarded per-call only | never |
| `customer.email`, `customer.full_name` | OPTIONAL, SENSITIVE | yes | yes (Paymob `billing_data`; Fawry `customerName`/`customerEmail`) | no | never |
| `merchant_reference` | OPTIONAL | yes | yes (Paymob `special_reference`; Fawry `merchantRefNum`) | yes | yes (it's a caller-chosen non-secret label) |
| `description` | OPTIONAL | yes | yes | no | never |
| `return_url` | OPTIONAL | yes | yes (Paymob `redirection_url` only) | no | never |
| `metadata` | OPTIONAL, bounded (20 entries × 500 chars) | yes | Paymob `extras` only; Fawry has no equivalent field and silently drops it | no | never |
| **Card number / CVV** | **FORBIDDEN** | never — no field in `PaymentRequest` accepts this | n/a | n/a | n/a |
| `Idempotency-Key` header | REQUIRED | yes | no | yes (as the uniqueness key) | yes (it's caller-chosen, not secret) |
| `X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*` headers | OPTIONAL, SECRET | stateless mode only | used to construct the selected provider request | never | never; edge/proxy logs must drop these headers |

Stateless credentials necessarily exist in the trusted caller and every TLS
terminator on the request path. They reduce credential storage, not the
number of processes that handle a secret.

## Outbound: OpenWrapper → provider

| Field | Class | Notes |
|---|---|---|
| Paymob `secret_key`, `hmac_secret` | SECRET | Held in `secrecy::Secret<String>`; only `expose_secret()`d inside `crates/providers/paymob/src/client.rs` (building the `Authorization` header) and `signature.rs` (HMAC key material) — enforced by `tests/architecture::secret_exposure_is_confined_to_known_call_sites` |
| Fawry `secure_key` | SECRET | Same treatment, `crates/providers/fawry/src/{client,signature}.rs` |
| Fawry `merchant_code` | SENSITIVE (not secret, but an account identifier) | Sent on every request; not logged |
| `OPENWRAPPER_API_KEYS` | SECRET | OpenWrapper's own caller-facing credential (`apps/gateway/src/auth.rs`). Compared in constant time, never logged, never echoed back in any response. |

## Inbound: provider → OpenWrapper webhook

| Field | Class | Received | Stored | Logged |
|---|---|---|---|---|
| Paymob transaction `id`, `amount_cents`, `success`, `pending`, flags | OPAQUE / REQUIRED for verification | yes (inside `obj`) | `id` as `provider_reference`; amount cross-checked, not separately stored twice | id + status only, on transition anomalies |
| Paymob `source_data.pan` | SENSITIVE but already provider-masked (last 4 digits only — Paymob never sends a full PAN in this callback) | yes | no | no |
| Paymob `hmac` (query param) | integrity proof, not itself secret | yes | no | no |
| Fawry `customerName`, `customerMobile`, `customerMail` | SENSITIVE | yes | **no** — explicitly stripped by `crates/providers/fawry/src/webhook.rs::redact_pii` before the event is handed to anything that might store or log it | no |
| Fawry `threeDSInfo`, `invoiceInfo` | potentially sensitive, undocumented full shape | yes | **no** — also stripped by `redact_pii` | no |
| Fawry `messageSignature` | integrity proof | yes | no | no |
| Fawry `orderStatus`, `paymentAmount`, `orderAmount`, `merchantRefNumber`, `fawryRefNumber` | REQUIRED for verification/mapping | yes | mapped into `PaymentStatus` + amount cross-check | provider + reference + status, on transition anomalies only |

## What's stored, in full

### 1. `payments` table
`id`, `idempotency_key`, `request_fingerprint` (a SHA-256 hash, not the
raw request body), `provider`, `provider_reference`, `status`,
`amount_minor_units`, `currency`, `merchant_reference`, `next_action_json`
(a redirect URL or reference code — not sensitive), timestamps, `user_id`, `api_key_id`.

### 2. `refunds` table (v0.2.0)
`id`, `payment_id`, `amount_minor_units`, `currency`, `status`, `reason`,
`idempotency_key`, `request_fingerprint`, `created_at`, `updated_at`.

### 3. `events` table (v0.2.0)
`id`, `event_type`, `resource_id`, `payload` (sanitized JSON representation of domain object), `created_at`.

### 4. `merchant_webhook_endpoints` & `merchant_webhook_deliveries` (v0.2.0)
`id`, `url`, `secret` (`whsec_...`), `events` (subscribed filters), `is_active`, `created_at`. Deliveries record `status_code`, `response_body` (truncated), `attempt`, `success`, `delivered_at`.

Notably **absent across all tables**: card numbers, CVVs, customer passwords, and merchant processor secrets. A
database dump of these tables cannot be used to compromise cardholder data or authenticate as the merchant to payment rails.

## Logging policy

Routine logs (`tracing::info!`) contain only: provider name, HTTP
method/path (via `tower_http::trace::TraceLayer`), and coarse timing.
Warning/error logs (anomalies: amount mismatch, illegal transition,
webhook for an unrecognized payment, ambiguous create-payment failure)
additionally include `provider`, `provider_reference`, and `status`
values — never customer PII, never a secret. This is checked by
`tests/architecture::secret_exposure_is_confined_to_known_call_sites`
for secrets; PII exclusion from logs is structural (the values are never
loaded into a variable in scope at any `tracing::` call site — customer
fields are dropped before they'd ever reach the store or a log
statement).

## No PCI/legal claims

OpenWrapper does not claim PCI DSS compliance or any other certification.
What can be said factually: all integrated flows (Paymob Unified Checkout,
Fawry PayAtFawry, Stripe Hosted Checkout) do not route raw card PAN or CVV through
OpenWrapper's process at any point, which reduces — but by itself does not
eliminate — PCI scope; actual scope depends on the merchant's full
environment, which is outside what this codebase can attest to. Anyone
deploying this should get their own compliance assessment rather than
relying on this document as one.
