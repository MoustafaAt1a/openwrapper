# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); this project
does not yet promise strict [SemVer](https://semver.org/) compatibility
guarantees before v1.0.0 — see §27/`docs/ARCHITECTURE.md`.

## [0.1.4] — Multi-Currency Integer Math, Mock Rail Adapter, 409 Idempotency Conflict & LTS Hardening

LTS release: Comprehensive ISO-4217 integer currency arithmetic (EGP, USD, EUR, GBP, SAR, AED, KWD, BHD, OMR, JPY) with zero-decimal formatting, new deterministic zero-network Mock payment rail adapter (`crates/providers/mock`), first-class HTTP 409 Idempotency Conflict error model across core, gateway, web, and all 3 client SDKs (TypeScript, .NET, PHP), rate limit token bucket clock drift mitigation, and synchronized v0.1.4 manifest release.

### Added & Hardened
- **Multi-Currency Integer Mathematics (`crates/core/src/money.rs`)**:
  - Expanded `Currency` enum to support MENA, GCC, and major global currencies: `EGP`, `USD`, `EUR`, `GBP`, `SAR`, `AED` (exponent 2), `KWD`, `BHD`, `OMR` (exponent 3, 1000 minor units per major unit), and `JPY` (exponent 0, zero-decimal).
  - Implemented exact minor-unit scaling in `major_units_display` without floating point math, rendering zero-decimal currencies cleanly as `{major}` without trailing decimals.
  - Added comprehensive unit test coverage for zero-decimal, two-decimal, and three-decimal minor-unit formatting and split distribution.
- **Provider-Neutral Mock Rail Adapter (`crates/providers/mock`)**:
  - Designed and built `openwrapper-provider-mock` implementing `openwrapper_core::Provider` (`create_payment`, `inquire_status`, `verify_and_parse_webhook`).
  - Deterministic simulation rules: amounts ending in `99` fail with decline, ending in `88` simulate upstream timeouts (`Unknown` outcome preserving Invariant I5), kiosk reference action for Fawry simulation, and redirect URLs for hosted checkout simulation.
  - Constant-time HMAC-SHA256 signature verification using `subtle::ConstantTimeEq`.
  - Fully registered in gateway (`apps/gateway`), stateless header dispatch, and verified in architecture invariant checks.
- **First-Class Idempotency Conflict Error (`HTTP 409 Conflict`)**:
  - Added `OpenWrapperError::IdempotencyConflict` to `crates/core/src/error.rs` with error code `"idempotency_conflict"`.
  - Mapped to `StatusCode::CONFLICT` (409) in gateway HTTP layer (`apps/gateway/src/handlers.rs`) and web control plane (`apps/web/app/api/v1/payments/route.ts`).
  - Added typed SDK exceptions: `IdempotencyConflictError` in TypeScript SDK (`sdk/typescript`), `IdempotencyConflictException` in .NET SDK (`sdk/dotnet`), and `IdempotencyConflictException` in PHP SDK (`sdk/php`).
  - Added full test coverage across all three SDK test suites and gateway integration tests.
- **Clock-Drift Hardened Token Bucket (`apps/gateway/src/rate_limit.rs`)**:
  - Mitigated forward clock drift by resetting `last_refill = now` when the bucket is full, preventing time-warp token starvation.
- **Centralized Version Constants & Monorepo Synchronization (`v0.1.4 LTS`)**:
  - Created `apps/web/lib/version.ts` with `OPENWRAPPER_VERSION = "0.1.4"` and `OPENWRAPPER_VERSION_TAG = "v0.1.4 LTS"`.
  - Synchronized all 11 monorepo manifest targets in unison via `scripts/version.mjs`.
  - Updated all documentation (`AGENTS.md`, `README.md`, `docs/LIMITATIONS.md`, `docs/OPERATIONS.md`, `docs/VERSIONING.md`, OpenAPI specs, and example checkout demo runners).
- **Native Rust Stripe Provider Adapter (`crates/providers/stripe`)**:
  - Designed and implemented `openwrapper-provider-stripe` implementing `openwrapper_core::Provider` (`create_payment`, `inquire_status`, `verify_and_parse_webhook`).
  - PCI-DSS SAQ-A compliant hosted Stripe Checkout Sessions (`POST /v1/checkout/sessions`) returning `PaymentNextAction::RedirectToUrl { url }`. Zero raw cardholder PAN enters OpenWrapper.
  - Dual status inquiry supporting both Checkout Sessions (`cs_...`) and PaymentIntents (`pi_...`), strictly preserving Invariant I5 (ambiguous outcomes never fail).
  - Constant-time HMAC-SHA256 signature verification with configurable replay timestamp tolerance (`Stripe-Signature: t=...,v1=...`).
  - Stateless credential forwarding (`X-Stripe-Secret-Key`, `X-Stripe-Webhook-Secret`) and server-side environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASE_URL`).
  - Integrated with `tests/architecture/tests/invariants.rs` verifying I1 (core independence), provider isolation, and confined `expose_secret()` call sites.
- **Deterministic Monorepo Versioning System (`scripts/version.mjs` & `docs/VERSIONING.md`)**:
  - Zero-dependency, cross-platform version orchestrator managing and synchronizing 11 manifest and contract targets across Rust (Cargo), TypeScript (npm/Bun), PHP (Composer), C# (NuGet), OpenAPI, and test vectors.
  - Provided CLI commands: `node scripts/version.mjs check`, `sync`, and `bump <major|minor|patch|x.y.z>`.
  - Added npm scripts: `bun run version:check`, `version:sync`, `version:bump`.
  - Added automated version coherence enforcement into `scripts/ci-full.sh` to prevent version drift across PRs and releases.
  - Authored comprehensive documentation in `docs/VERSIONING.md` defining the SemVer 2.0.0 policy and release workflow.

### Fixed & Hardened
- **Oracle Cloud Always Free & Cloudflare HA Infrastructure**: Created 12-container production stack for Ampere A1 ARM64 (4 OCPUs, 24 GB RAM, 200 GB NVMe) combined with Cloudflare Zero Trust Tunnel (zero open inbound ports), Caddy load balancer, and Cloudflare R2 S3 offsite backups. Included automated host optimization (`setup-host.sh`) with Google BBR congestion control, zero-downtime rolling deployments (`deploy.sh`), SHA256-verified hot backups (`backup.sh`), disaster recovery (`restore.sh`), and instant terminal diagnostics (`healthcheck.sh`).
- **24/7 Observability & Telemetry**: Built native Prometheus `/metrics` endpoint on the Rust Gateway and pre-provisioned a comprehensive Grafana production dashboard monitoring host CPU, 24GB RAM utilization, NVMe storage, healthy gateway replicas, HTTP status rate breakdown, P50/P95/P99 latency percentiles, cAdvisor container resources, and network bandwidth.
- **PgBouncer Transaction-Mode Advisory Lock Hardening**: Replaced session-level `pg_advisory_lock` with transaction-scoped `pg_advisory_xact_lock` inside `pool.begin()` in `PostgresStore::init_schema`. Added `ignore_startup_parameters = extra_float_digits,search_path,application_name,timezone` and `admin_users`/`stats_users` to `pgbouncer.ini` to eliminate connection resets and connection pinning leaks.
- **Stateless HTTP Client Connection Pooling**: Replaced per-request `reqwest::Client` instantiations in `apps/gateway/src/stateless.rs` with a shared, high-performance connection pool (`with_http` constructors on `FawryProvider` and `PaymobProvider`), eliminating TCP/TLS handshake overhead on stateless merchant requests.
- **Cryptographic Constant-Time LLVM Hardening**: Added `std::hint::black_box` to bitwise difference checks in `auth::constant_time_eq` and `fawry::constant_time_eq_hex` to guarantee immunity against compiler branch-elimination optimizations.
- **Kubernetes & K3s Declarative Manifests**: Added `infra/k8s/backend.yaml` (PostgreSQL StatefulSet, PgBouncer, Valkey 8, RabbitMQ 3.13, Cloudflared) and architecture guide (`infra/k8s/README.md`) comparing single-node Docker Compose vs K3s.
- **Enterprise Monorepo Architecture Reorganization**: Restructured monorepo into high-standard clean layers: deployable applications in `apps/` (`apps/gateway`, `apps/web`), domain and provider integration libraries in `crates/` (`crates/core`, `crates/providers/paymob`, `crates/providers/fawry`), and consolidated provider research in `docs/research/`. Updated Cargo workspace members, Bun workspace patterns, Dockerfiles, compose stacks, and architectural invariant suites.
- **Monorepo Modernization with Bun & Biome**: Migrated monorepo workspaces (`apps/web`, `sdk/typescript`, `examples/checkout-demo`) to **Bun v1.3.3** with unified root `bun.lock`. Replaced legacy multi-linter configs with **Biome 2.5.12** (`biome.json`), checking and formatting the entire codebase in sub-100ms. Updated `apps/web/Dockerfile` to use `oven/bun:1-alpine` for ultra-fast dependency caching and builds.
- **Database Performance & Fair-Queue Indexing**: Added composite indexes `idx_payments_status_updated ON payments (status, updated_at)` in SQLite and PostgreSQL schemas for $O(\log N)$ background reconciliation scans. Enabled `PRAGMA synchronous = NORMAL;` on SQLite WAL mode to eliminate redundant fsync bottlenecks.
- **HTTP Security & Gateway Hardening**: Enforced security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`) across all Rust gateway and Web API responses. Sealed constant-time SHA-256 API key authentication and timing side-channel defenses.
- **Mock & Hardcoded Artifact Purge**: Removed demo seed routes and scripts, purging hardcoded mock keys from UI components, load tests, and environment templates.
- **Documentation & Operations Alignment**: Synchronized `CONTRIBUTING.md`, `README.md`, `docs/DECISIONS.md` (D20, D21), `docs/RAILWAY.md`, and CI/shell scripts to accurately reflect Bun commands, Biome checks, and production operational standards.

## [0.1.3] — Mathematical Rigor, DESIGN.md Cal.com Architecture & PHP SDK Hardening

LTS release: Zero-float financial arithmetic with basis points and Euclidean remainder split distribution, branchless SplitMix64 PRNG jitter engine, strict alignment of web platform with `docs/DESIGN.md` (Cal.com SaaS design system, inverted featured pricing tier, and negative tracking), PHP SDK defensive wire parsing, and gRPC unknown-outcome first-class response contract (Invariant I5).

### Added & Hardened
- **Mathematical Financial Primitives (`crates/core/src/money.rs`)**:
  - Implemented `checked_mul_bps(&self, bps: u32) -> Option<Money>` for basis-points fee calculations ($1 \text{ bps} = 0.01\%$) with exact integer arithmetic and overflow checking.
  - Implemented `split_into(&self, n: usize) -> Result<Vec<Money>, MoneyError>` using Euclidean remainder distribution ($q = A/n, r = A \pmod n$) guaranteeing that $\sum_{i=1}^n s_i \equiv A$ with zero lost piasters or cents.
  - Formatted `Currency::Egp` with Serde uppercase ISO-4217 standard (`"EGP"`) while accepting `"Egp"` as a backward-compatible alias.
- **SplitMix64 Full Jitter PRNG (`crates/core/src/retry.rs`)**:
  - Replaced ad-hoc bitshift jitter with the mathematically proven, branchless **SplitMix64** algorithm, passing BigCrush statistical tests and ensuring uniform exponential backoff jitter distribution without floating-point drift.
- **PHP SDK Hardening (`sdk/php`)**:
  - Hardened `Payment::fromWire` and `PaymentNextAction::fromWire` with defensive null-coalescing and safe type casting, preventing PHP undefined array key warnings when providers omit optional fields (`provider_reference`, `merchant_reference`, `instructions`).
  - Added dedicated test cases verifying defensive parsing in `sdk/php/tests/run.php`. Bumped composer package to `v0.1.3`.
- **Web Platform & `docs/DESIGN.md` Cal.com System Alignment (`apps/web`)**:
  - Implemented the signature Cal.com pricing cards defined in `docs/DESIGN.md`: white canvas `pricing-tier-card` (`#ffffff`, 12px rounded, 32px padding) and inverted dark surface `pricing-tier-card-featured` (`#101010`, white text, no accent border).
  - Corrected version badges across the web surface (`apps/web/app/page.tsx`, `apps/web/components/auth-page.tsx`, `apps/web/app/dashboard/documentation/page.tsx`, `apps/web/lib/graphql/resolvers.ts`, `apps/web/test/graphql.test.ts`) to `v0.1.3 LTS`.
  - Corrected Composer package installation reference to `composer require openwrapper/sdk` and added official .NET SDK command `dotnet add package OpenWrapper`.
  - Resolved all Biome formatting and import-sorting issues across web files (`bunx @biomejs/biome check .` passing cleanly).
- **Postgres Parity & Invariant I5 gRPC Compliance (`apps/gateway`)**:
  - Added `api_keys` table creation to `PostgresStore::init_schema`, guaranteeing out-of-the-box API key authentication on fresh Postgres databases.
  - Updated `PaymentGatewayService::create_payment` to return a `PaymentResponse` with `status: "unknown"` and the persisted `payment_id` on ambiguous provider outcomes rather than crashing with `Status::internal`, fulfilling Invariant I5.
  - Updated `stream_payment_events` to deliver initial payment state events and support persistent channel streaming.

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
