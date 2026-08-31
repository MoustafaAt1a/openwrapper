# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); this project
does not yet promise strict [SemVer](https://semver.org/) compatibility
guarantees before v1.0.0 — see §27/`docs/ARCHITECTURE.md`.

## [0.1.1] — LTS Hardening, Mathematical Precision & Zero-Allocation Security

Polished LTS v0.1.1 release: comprehensive audit across mathematical money foundations, cryptographic security, rate limiter precision, starvation-free reconciliation, panic-safe URL decoding, and SDK authentication parity.

### Added
- **Checked monetary arithmetic** (`Money::checked_add`, `Money::checked_sub`, `Money::checked_mul_scalar` in `core/src/money.rs`), enforcing strict integer-only monetary algebra with overflow bounds and currency consistency.
- **SDK API key authentication support**:
  - TypeScript SDK (`@openwrapper/sdk`): added `apiKey` option to `OpenWrapperClientOptions` and automatic `X-API-Key` header injection.
  - PHP SDK (`openwrapper/sdk`): added `$apiKey` constructor parameter to `OpenWrapperClient` and automatic `X-API-Key` header injection.
- **Reconciliation fair queueing**: Added `touch_reconciliation_attempt` to `PaymentStore` (SQLite and Postgres), advancing timestamps on unresolved `Unknown` payments to eliminate batch queue starvation.
- **Resilient webhook field parsing**: Fawry webhook adapter now seamlessly accepts both `paymentRefrenceNumber` (documented typo) and `paymentReferenceNumber`.
- **Full-featured Next.js 16 Web Dashboard & Platform**: Modern developer portal featuring live telemetry stream, transaction ledger, API key management, interactive documentation sandbox, and Cal.com-inspired responsive UI.
- **SQLite Standalone API Key Schema**: Added automated `api_keys` table creation in `SqliteStore::open` for seamless out-of-the-box authentication in single-instance deployments.

### Fixed & Optimized
- **Zero-allocation constant-time comparison** in gateway API key auth (`gateway/src/auth.rs`) and Fawry signature checking (`providers/fawry/src/signature.rs`), eliminating heap buffer allocations in the request path and protecting against timing side-channels.
- **State Machine Invariant I13 Protection**: Hardened web webhook handlers (Paymob, Fawry, Stripe) against overwriting immutable terminal states (`succeeded` / `failed`).
- **Lossless Next-Action Parity**: Added full `next_action` support to `GET /api/v1/payments/:id` matching `POST /api/v1/payments` and OpenAPI 3.1 specifications.
- **Integer fixed-point rate limiter**: Upgraded in-process `TokenBucket` to use drift-free microsecond integer fixed-point math (`u64` microtokens) rather than floating-point accumulation, and tightened distributed limiter cache TTL to `2 * window_secs`.
- **Panic-safe URL decoding**: Replaced string-slice index parsing in `gateway/src/handlers.rs::urlencoding_decode` with panic-safe byte-level hex parsing.
- **React 19 / Base UI Clean Composition**: Refactored `Button` with clean `asChild` composition and fixed Recharts 3.x responsive dimensioning.
- **Silenced compiler warnings**: Added `#[allow(dead_code)]` to optional `ChargeResponse` deserialization fields in Fawry provider.

## [0.1.0] — first foundation

Initial release. Core domain model, payment state machine, Paymob and
Fawry adapters, SQLite-backed idempotency/webhook store, minimal HTTP
gateway, TypeScript and PHP SDKs. See `docs/ARCHITECTURE.md` for the full
shape and `docs/LIMITATIONS.md` for what was explicitly deferred.
