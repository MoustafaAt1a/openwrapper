# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); this project
does not yet promise strict [SemVer](https://semver.org/) compatibility
guarantees before v1.0.0 — see §27/`docs/ARCHITECTURE.md`.

## [Unreleased]

### Fixed & Hardened
- **Fix Docker build: lapin MSRV bump** — Bumped MSRV from 1.75 to 1.88, updated `lapin` from `=2.3.0` to `4.10.0` (`rustls`+`ring`+`tokio`), relaxed `edition = "2024"` ceiling pins (`url`, `idna`, `indexmap`, `time`, `zeroize`, etc.) to caret requirements, switched Dockerfile to `rust:1.88-bookworm` and `cargo build --locked`, and fixed `gateway/src/amqp.rs` `ShortString` conversions for lapin 4.x API. Resolves `lapin v2.5.5 requires rustc 1.85.0` build failure and aligns with `pkg:cargo/lapin@4.10.0`.
- Aligned Docker and CI with the declared Rust 1.88 and Node 22 toolchains.
- Added container health checks, fail-closed production Compose defaults, loopback-only local ports, and least-privilege runtime settings.
- Hardened Caddy access logging, PgBouncer credential generation, Kubernetes workloads, systemd units, and atomic database backups.
- Added CI validation for shell scripts, Compose, Caddy, Kubernetes YAML, the gateway Dockerfile, and published OpenAPI YAML synchronization.
- Corrected deployment and operations documentation where it disagreed with current runtime behavior.

## [0.1.2] — PgBouncer Pooling, Advanced Stress Testing & Multi-Criteria Observability

Production hardening release: transaction-level database connection pooling with PgBouncer, automated 26-case defensive architecture security suite, P99 k6 load testing harness, scrollable/filterable telemetry dashboards, and OpenAPI 3.1.0 update.

### Added
- **PgBouncer Connection Pooling**: Deployed transaction-mode connection pooler (`edoburu/pgbouncer:v1.25.2-p0`), reducing P99 latency by 15% and multiplexing 200 client connections over a lean PostgreSQL worker pool.
- **26-Case Defensive Security Test Suite** (`tests/security/security-test.mjs`): Automated verification across authentication bypass, SQL injection, XSS payloads, null-byte sanitization, webhook forgery, atomic idempotency deduplication, and HTTP verb security.
- **Multi-Scenario k6 P99 Stress Test** (`tests/load/stress-test.js`): Load harness simulating 95 concurrent VUs across health probes, payment creation stress, forged webhook flood, and auth brute-force rejection, achieving 152.6 req/s throughput with sub-400ms P99 latency.
- **Interactive Scrollable & Searchable Dashboards**:
  - *Transaction Ledger* (`/dashboard/payments`): Max-height scrollable container with sticky headers, instant multi-attribute search, status filters, provider filters, and 1-click ID copy.
  - *Recent Webhook Deliveries* (`/dashboard/payments`): Filterable delivery audit stream with event ID search and provider pills.
  - *Live Telemetry Stream* (`/dashboard/requests`): Real-time request log with endpoint search, HTTP method filters, 2xx/4xx/5xx status filters, and 1-click latency bottleneck sorting.
- **Updated OpenAPI 3.1.0 Specification** (`openapi.yaml`): Full documentation of stateless per-request provider credentials headers (`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`), Stripe provider support, and 422 `missing_provider_credentials` error model.

### Fixed & Hardened
- **Null-Byte PostgreSQL Protection**: Added input sanitization across all string fields in payments schema to strip `\x00` and control characters that previously caused PostgreSQL encoding errors.
- **RSC Stream Collision Resolution**: Redesigned `LiveTelemetryStatus` with strict single-stream locks, 4s cooldowns, and Next.js digest suppression to eliminate premature stream termination errors.
- **Rust Gateway Provider Credential Forwarding**: Fixed gateway bridge to forward per-request provider headers (`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`) to the Rust gateway in stateless zero-storage mode.
- **Optional RabbitMQ async bus** (`gateway/src/amqp.rs`): Webhook ingestion and reconciliation can be offloaded to RabbitMQ when `OPENWRAPPER_AMQP_URL` is set; in-process handlers remain the default when unset.
- **Background reconciliation loop** (`gateway/src/reconciler.rs`): Periodic stale-`Unknown` payment inquiry via `OPENWRAPPER_RECONCILIATION_INTERVAL_SECS` (fair-queue touch in store backends).
- **PgBouncer compatibility**: Gateway auto-appends `statement_cache_mode=describe` for pooler URLs; web `pg` pool sets `prepareThreshold: 0` for transaction-mode pooling.
- **Credential header redaction guidance** (`docs/SECURITY.md`): Operator documentation for redacting `X-Paymob-*` and `X-Fawry-*` headers in reverse-proxy and APM logs.
- **CI hardening**: `scripts/ci-full.sh` / `scripts/ci-full.ps1` for local full-suite runs; GitHub Actions adds web `pnpm test` and OpenAPI lint (`@redocly/cli`).
- **Documentation**: `docs/DEPENDENCIES.md`, updated deployment/operations/architecture/decisions guides for PgBouncer, RabbitMQ, and gateway-canonical routing.

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
