# OpenWrapper Developer & AI Agent Guide (AGENTS.md)
**Version**: `0.1.3 LTS`  
**Audience**: Human Software Engineers & Autonomous AI Coding Agents (Gemini, Claude, GPT, Cursor, Copilot)  
**Objective**: Provide an authoritative, unambiguous, zero-hallucination reference manual for understanding, building, testing, auditing, and extending the OpenWrapper codebase.

---

## 1. System Mission & Core Architecture

OpenWrapper is a provider-neutral financial transaction gateway and developer platform designed for MENA (Egypt/GCC) and global payment rails (Paymob, Fawry, Kashier, Stripe, Mock).

```
                      SYSTEM TOPOLOGY
┌────────────────────────────────────────────────────────┐
│  Client Applications (TypeScript, .NET 8, PHP 8, CLI)   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS (REST) / gRPC (HTTP/2)
┌──────────────────────────▼─────────────────────────────┐
│  Ingress & Control Plane:                              │
│  - apps/gateway: Axum 0.8 / Tokio / Tonic gRPC (:50051)│
│  - apps/web: Next.js 15 App Router / Drizzle ORM       │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
┌──────────────▼──────────┐ ┌──────────────▼─────────────┐
│  Authoritative Storage  │ │  Provider Rail Adapters     │
│  - PostgreSQL / PgBouncer│ │  - crates/providers/paymob  │
│  - SQLite WAL (Edge)    │ │  - crates/providers/fawry   │
│  - Valkey (Rate Limit)  │ │  - crates/providers/stripe  │
│  - RabbitMQ (Async AMQP)│ │  - crates/providers/mock    │
└─────────────────────────┘ └──────────────┬─────────────┘
                                           │ Outbound TLS
                                           ▼
                            Upstream Payment Processors
```

### Key Architectural Principles
1. **Stateless Zero-Knowledge Mode**: The platform does not require merchant provider keys to be stored in the database. Credentials are provided dynamically per-request via encrypted TLS headers (`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`) or configured statically via ambient environment variables.
2. **Deterministic State Machine**: Payment states flow through strict transitions: `Initiated` $\rightarrow$ `Pending` $\rightarrow$ `Successful` / `Failed` / `RequiresAction` $\rightarrow$ `PartiallyRefunded` / `Refunded`. Terminal states never revert.
3. **Discrete Integer Minor Units**: All monetary amounts are `i64` minor units (`amount_minor_units`). **Never use IEEE 754 floating-point numbers (`f32`, `f64`, JavaScript `number` without rounding) for currency math.**

---

## 2. Repository Topology & Code Ownership

| Directory | Language / Framework | Description & Boundaries |
| :--- | :--- | :--- |
| `crates/core` | Rust (Zero-I/O) | Pure domain model, state machines, currency rules, provider trait (`PaymentProvider`). **Zero dependencies on provider crates or network crates.** |
| `crates/providers/*` | Rust | Concrete provider adapters (`paymob`, `fawry`, `stripe`, `kashier`, `mock`). Translates canonical commands to vendor HTTP wire payloads. |
| `apps/gateway` | Rust (Axum, Tokio, Tonic) | Main HTTP (`:8080`) and gRPC (`:50051`) payment gateway binary. Owns idempotency, rate limiting, and database abstraction. |
| `apps/web` | TypeScript (Next.js 15, Bun) | Developer portal, GraphiQL explorer (`/api/graphql`), live telemetry, and checkout playground. |
| `sdk/typescript` | TypeScript (Bun, Fetch) | `@openwrapper/sdk`: Zero-dependency browser and Node.js client. |
| `sdk/dotnet` | C# (.NET 8.0/9.0) | `OpenWrapper`: Strongly-typed NuGet client with `System.Text.Json` source generation. |
| `sdk/php` | PHP 8.1+ (Composer) | `openwrapper/sdk`: PSR-18 / PSR-17 compliant client. |
| `examples/checkout-demo` | Polyglot | Multi-SDK reference checkout application with TypeScript, PHP, and .NET runners. |
| `proto` | Protobuf v3 | `openwrapper/v1/payment.proto` gRPC contract. |
| `docs/openapi` | OpenAPI 3.1.0 | Canonical OpenAPI spec (`openapi.yaml`, `openapi.json`). |
| `scripts` | Node.js / Bash / PowerShell | Monorepo CI orchestration and version synchronization (`version.mjs`). |

---

## 3. Non-Negotiable Invariants (Audit Laws)

When modifying or generating code, ensure these invariants are strictly preserved:

- **I1 (No Floating-Point Math)**: All currency amounts must be integer minor units (`amount_minor_units: i64`).
- **I2 (AST Separation)**: `crates/core` must never import `crates/providers/*` or `apps/*`. Enforced by `cargo test -p openwrapper-test-architecture`.
- **I3 (No Secret Persistence)**: Merchant provider credentials must never be written to database tables or logged in telemetry.
- **I4 (Idempotency Strictness)**: The `idempotency_keys` table enforces uniqueness on `(key, scope)`. Identical key with different payload must return `409 Conflict`. Identical key with identical payload must return the cached response without re-executing provider calls.
- **I5 (Bounded I/O)**: All HTTP client calls to external payment rails must have explicit timeouts (10s connect, 30s read/write).
- **I6 (No Static Heap Leaks)**: Never use `Box::leak` for dynamic runtime parameters or request-scoped metadata.
- **I7 (Store Parity)**: SQLite (`SqliteStore`) and PostgreSQL (`PostgresStore`) must maintain functional parity for tenant ownership, API key validation, and status updates.
- **I8 (Synchronized Manifest Versions)**: All 11 package manifests must share the exact same version string (verified via `node scripts/version.mjs check`).

---

## 4. Standard Developer Toolchains & Commands

### Monorepo Validation (Run Before Submitting Any PR)
```bash
# Full test and validation across all languages:
bash scripts/ci-full.sh       # Linux / macOS
powershell scripts/ci-full.ps1 # Windows

# 1. Version coherence check (must be 11/11 MATCH):
node scripts/version.mjs check

# 2. Rust formatting & strict clippy:
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings

# 3. Rust test suite & architecture invariant tests:
cargo test --workspace
cargo test -p openwrapper-test-architecture

# 4. TypeScript / Web linting & formatting (Biome):
bunx @biomejs/biome check .

# 5. TypeScript SDK tests:
cd sdk/typescript && bun test && cd ../..

# 6. .NET SDK tests:
dotnet test sdk/dotnet/OpenWrapper.sln

# 7. PHP SDK tests:
cd sdk/php && php tests/run.php && cd ../..

# 8. Next.js type-check & Turbopack production build:
cd apps/web && bun run lint && bun run test && bun run build && cd ../..

# 9. OpenAPI specification lint:
bunx @redocly/cli lint docs/openapi/openapi.yaml
```

---

## 5. Environment Variables & Conventions

Refer to `.env.example` in repository root for complete annotations.

### Essential Platform Environment Variables:
- `OPENWRAPPER_BIND_ADDR`: Gateway HTTP bind socket (default `127.0.0.1:8080`).
- `PORT`: Platform port override (Railway, Render, Fly.io).
- `OPENWRAPPER_DATABASE_URL`: Persistence connection:
  - `openwrapper.sqlite3` for local edge SQLite.
  - `postgres://user:pass@host:5432/db` for PostgreSQL.
  - `postgres://user:pass@pgbouncer:6432/db` for PgBouncer pooling.
- `OPENWRAPPER_API_KEYS`: Comma-separated API keys. Gateway refuses to start without this unless `OPENWRAPPER_DISABLE_AUTH=true`.
- `OPENWRAPPER_CACHE_URL`: Optional Valkey/Redis instance for distributed rate limiting.
- `OPENWRAPPER_AMQP_URL`: Optional RabbitMQ URL for async webhook handling.
- `OPENWRAPPER_DISABLE_GRPC`: Set `true` to disable the Tonic gRPC server on `:50051`.

### Merchant Client Header Conventions:
- `X-API-Key: <key>` or `Authorization: Bearer <key>`: Gateway authentication.
- `Idempotency-Key: <unique-string>`: Request deduplication token.
- `X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`: Stateless dynamic provider credentials.

---

## 6. How to Extend OpenWrapper

### Adding a New Provider Rail
1. Create new crate under `crates/providers/<provider-name>`.
2. Implement the `PaymentProvider` trait from `openwrapper-core`.
3. Map internal errors into canonical `openwrapper_core::Error` variants.
4. Implement webhook signature verification using constant-time comparisons (`subtle::ConstantTimeEq`).
5. Register the provider in `apps/gateway/src/main.rs` and `apps/gateway/src/stateless.rs`.
6. Add provider test vectors in `tests/vectors/`.
7. Update `docs/openapi/openapi.yaml`.

### Bumping Monorepo Versions
Never edit version strings manually across the 11 files. Use the orchestrator:
```bash
# Check current version status:
node scripts/version.mjs check

# Bump all manifests to a new SemVer:
node scripts/version.mjs set 0.1.4
```

---

## 7. Sandbox Test Credentials Reference

| Rail | Type | Test Details | Expected Result |
| :--- | :--- | :--- | :--- |
| **Paymob** | 3DS Card | Number: `5123 4500 0000 0008` \| Exp: `12/28` \| CVV: `123` \| OTP: `123456` | Authorizes & transitions to `Successful` |
| **Paymob** | Meeza Card | Number: `5078 0300 0000 0001` \| Exp: `12/28` \| CVV: `123` \| OTP: `123456` | Egyptian local debit authorized |
| **Paymob** | Wallet | Phone: `+201010000000` (Vodafone) \| PIN: `1234` | Direct wallet deduction |
| **Fawry** | PayAtFawry | Phone: `+201012345678` | Returns 9-digit kiosk reference number |
| **Stripe** | 3DS Card | Number: `4242 4242 4242 4242` \| Exp: `12/28` \| CVV: `123` | Complete Checkout session |
