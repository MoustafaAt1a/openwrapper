# Decisions

Every non-obvious architectural choice, in the form §26 asks for. Entries
are ordered roughly as they were made.

---

### D1: Deployment model — standalone minimal HTTP gateway

- **Question**: library, embedded service, or standalone HTTP gateway (§4)?
- **Evidence**: multiple SDKs (TypeScript, PHP, and later .NET) need to consume the same
  security-critical logic (signature verification, idempotency, state
  machine) the Rust core implements. WASM is explicitly out of scope
  absent concrete justification (§18); PHP has no mature, low-risk FFI
  story for arbitrary async Rust.
- **Alternatives**: (a) pure library + reimplement logic per SDK language
  — rejected, duplicates security-critical logic three times, the exact
  drift risk this project exists to avoid; (b) WASM — rejected per §18,
  no concrete benefit demonstrated; (c) native FFI (napi-rs / a PHP
  extension) per language — rejected, multiplies build/security surface
  disproportionately for a v0.1.0 scope, and doesn't solve PHP well.
- **Trade-offs**: an HTTP boundary means one more network hop and one
  running process to operate, versus a library's zero-hop simplicity.
- **Decision**: standalone HTTP gateway, deliberately minimal. The original
  four-route/no-broker shape later gained two operational routes and an
  optional RabbitMQ integration (D18), while retaining no service mesh.
- **Consequence**: provider credentials never need to exist outside the
  gateway process — a security improvement that falls out of this choice
  rather than being separately engineered.

---

### D2: SQLite as the original single-instance store

- **Question**: what's the smallest persistence mechanism that satisfies
  the concurrency invariant (§11)?
- **Evidence**: the invariant needed is "under concurrent same-key
  callers, exactly one proceeds" — a `UNIQUE` SQL constraint gives this
  for free from the database engine.
- **Alternatives**: in-memory `HashMap` — explicitly ruled out by §11
  (doesn't survive a restart); Redis/a distributed database — explicitly
  ruled out by §11 absent evidence of need.
- **Trade-offs**: a single SQLite file is a single-writer, single-process
  store — it does not itself coordinate multiple gateway replicas sharing
  one file. Documented as a known limitation rather than solved
  prematurely.
- **Decision**: SQLite via `rusqlite` (`bundled` feature — vendors SQLite
  itself, no system dependency), one connection behind a `Mutex`.
- **Consequence**: correctness is provable and was actually proven — see
  `store.rs`'s concurrent-threads test — without any distributed-systems
  code. Scaling beyond one process is future work, not a v0.1.0 claim.

---

### D3: `ProviderId` as a validated string, not a closed core enum

- **Question**: how does core represent "which provider" without knowing
  about specific providers (I1)?
- **Alternatives**: `enum ProviderId { Paymob, Fawry }` in core — rejected,
  because adding a third provider would then require editing core, which
  is exactly the coupling I1 forbids.
- **Decision**: a validated newtype wrapping a `String`
  (`core/src/ids.rs`), with each provider crate exposing its own
  `PROVIDER_ID: &str` constant.
- **Consequence**: "add a provider" is genuinely "write a crate + register
  it" (`docs/ARCHITECTURE.md`), not "write a crate + also touch core."

---

### D4: `PaymentNextAction` as two variants, not one generic URL field

- **Question**: how to represent "what the customer does next" across
  Paymob (redirect) and Fawry (pay-at-reference-code) without a false
  universal model (§8)?
- **Decision**: `RedirectToUrl { url }` and `PayAtReference { reference,
  instructions }` as distinct variants.
- **Consequence**: a caller (or SDK) cannot accidentally treat a Fawry
  reference code as a URL to redirect to — the type system prevents the
  specific class of integration bug a flattened field would invite.

---

### D5: Fawry's `ProviderReference` stores `merchantRefNumber`, not `fawryRefNumber`

- **Question**: core documents `ProviderReference` as "opaque reference
  issued by a provider" — which of Fawry's two reference-shaped fields
  should fill that role?
- **Evidence**: Fawry's Get Payment Status V2 endpoint (the mechanism
  behind `inquire_status`, i.e. §13's resolution path for `Unknown`
  outcomes) is keyed on `merchantRefNumber`, not `fawryRefNumber`
  (`research/fawry.md`).
- **Alternatives**: store `fawryRefNumber` (matches the "provider-issued"
  framing more literally) and separately track `merchantRefNumber`
  in adapter-local state — rejected, would require the adapter to be
  stateful, which nothing else in this codebase's adapters are.
- **Decision**: `ProviderReference` = `merchantRefNumber` for the Fawry
  adapter specifically; the customer-facing code is still surfaced
  correctly via `PaymentNextAction::PayAtReference`. Documented in
  `providers/fawry/src/lib.rs`'s module docs.
- **Consequence**: `inquire_status` works without adapter-local state, at
  the cost of `ProviderReference` meaning something slightly different
  per adapter — acceptable because core only ever treats it as opaque.

---

### D6: `PaymentId` is assigned once, by the gateway, before `create_payment` runs

- **Question**: who assigns OpenWrapper's own payment identifier?
- **History**: the first draft had each provider adapter call
  `PaymentId::new()` independently inside `create_payment`, discovered
  while wiring the gateway to be a real bug — the store's `begin_payment`
  *also* generates a `PaymentId`, so the same logical payment would end
  up with two different ids.
- **Decision**: `Provider::create_payment` takes `payment_id: &PaymentId`
  as a parameter; adapters use it (Fawry's `merchantRefNum` derivation)
  but never mint their own.
- **Consequence**: caught and fixed before it shipped, precisely because
  the gateway was wired end-to-end and tested rather than each crate
  being verified only in isolation.

---

### D7: `reqwest` + `rustls-tls`, not the system OpenSSL binding

- **Question**: which TLS backend for outbound provider calls?
- **Evidence**: `reqwest` documents both `native-tls` (OpenSSL) and
  `rustls` backends.
- **Alternatives**: `native-tls` — rejected, adds a system OpenSSL
  dependency (version drift across deployment environments, a much larger
  historical CVE surface).
- **Decision**: `rustls-tls`, a memory-safe pure-Rust implementation, no
  system dependency.
- **Consequence**: one fewer moving part to reproduce across
  environments; consistent with §17's "minimal unsafe" preference.

---

### D8: `serde_json`'s `arbitrary_precision` feature, enabled workspace-wide

- **Question**: how to reconstruct Fawry's own signature input exactly,
  given their webhook payload carries decimal amounts as JSON numbers?
- **Evidence**: a first attempt at a webhook test failed specifically
  because `serde_json::Number::to_string()` on a normally-parsed `f64`
  drops a trailing zero (`100.00` -> `100.0`), which would never match a
  signature Fawry computed from `"100.00"`.
- **Alternatives**: manual float-to-string rounding — rejected, reduces
  to reimplementing decimal formatting on top of `f64`, the exact thing
  invariant I4 (no floating point in financial arithmetic) warns against.
- **Decision**: `arbitrary_precision`, which preserves a JSON number's
  original digit text through parsing without ever constructing an `f64`.
- **Consequence**: `providers/fawry/src/decimal.rs` does all amount
  arithmetic as string/integer operations; a real test failure is what
  surfaced this, not foresight — kept in `docs/DECISIONS.md` deliberately
  as an example of the process working.

---

### D9: Rust dependency versions pinned below their latest releases

- **Question**: several transitive dependencies (`time-core`, `zeroize`,
  `idna_adapter`, `indexmap`, ...) fail to build under this sandbox's
  available Rust toolchain (1.75, installed via `apt`, since `rustup`'s
  domain isn't in the sandbox's network allowlist) because their newer
  releases declare `edition = "2024"`.
- **Decision**: explicit `=` version pins in the workspace root
  `Cargo.toml`, each with a comment explaining why. Updated 2025-09:
  MSRV bumped to 1.88 (supports `edition = "2024"` since 1.85); pins
  relaxed to caret requirements (`2.5`, `1.7`, etc.) and `Cargo.lock` +
  `cargo build --locked` now provide reproducibility. See `docs/DEPENDENCIES.md`.
- **Consequence**: the original pins were a sandbox artifact, not a real
  constraint — a normal development machine with a current stable Rust
  would not need them. On MSRV 1.88 the resolver can track security
  updates while the Docker build stays deterministic via `--locked`. See `docs/LIMITATIONS.md`.

---

### D10: `curl` (PHP) / native `fetch` (TypeScript), not Guzzle/axios

- **Question**: what HTTP client should each SDK use?
- **Evidence**: the TypeScript and PHP SDKs need exactly "send JSON, read status + body
  back" — no interceptor chains, no connection pooling tuning, no
  multipart uploads.
- **Decision**: PHP's built-in `ext-curl` behind an injectable
  `HttpTransport` interface (for testability); TypeScript's native
  `fetch` (Node 18+) behind an injectable `fetchImpl` parameter.
- **Consequence**: the SDKs have zero third-party runtime dependencies.
  Both are still fully unit-testable — proven, not asserted — via the
  injection points (`FakeHttpTransport` in PHP, a fake `fetch` in TS).

---

### D11: PHP SDK tested with a hand-rolled harness, not PHPUnit

- **Question**: PHPUnit is the idiomatic choice (§20 asks for one), but
  this sandbox has no network access to `packagist.org`.
- **Decision**: `composer.json` declares PHPUnit as the intended
  `require-dev` tool for real development environments; this repository
  additionally ships a ~40-line dependency-free assertion harness
  (`sdk/php/tests/TestRunner.php`) so the suite is actually runnable and was
  actually run here.
- **Consequence**: 7/7 tests genuinely executed and passing in this
  environment (not just written) — see the root `README.md`'s testing
  section. A contributor with packagist access should prefer
  `composer install && composer test`.

---

### D12: Postgres as a second store backend, behind a `PaymentStore` trait

- **Question**: SQLite (D2) is correct for one process but explicitly
  documented as not coordinating multiple gateway replicas. Real-world
  hosting for feedback-gathering benefits from being able to run more
  than one instance for availability.
- **Evidence**: the same `UNIQUE` constraint mechanism that makes
  SQLite's idempotency correct within one process (§11) is a property of
  the SQL standard, not of SQLite specifically — Postgres enforces it
  identically, including across genuinely independent connections from
  separate processes. Proven, not assumed: a live test
  (`concurrent_identical_requests_across_real_connections_only_one_proceeds`)
  ran 8 concurrent `begin_payment` calls from 8 independent pooled
  connections against a real local Postgres instance and confirmed
  exactly one proceeded.
- **Alternatives**: replace SQLite outright — rejected, SQLite remains
  strictly better for the common "just trying this out" single-instance
  case (zero extra infrastructure); support both, selected by config —
  chosen.
- **Decision**: extracted a `PaymentStore` trait
  (`gateway/src/store/mod.rs`), mirroring the existing `Provider` trait
  pattern in this codebase, with `store/sqlite.rs` and `store/postgres.rs`
  as interchangeable implementations, selected via
  `OPENWRAPPER_DATABASE_URL` (`main.rs::open_store`).
- **Consequence**: `AppState.store` is now `Arc<dyn PaymentStore>`; every
  call site gained `.await` (SQLite's implementation is a thin async
  wrapper around its original synchronous methods — see `sqlite.rs`'s
  module docs for why that's legal and zero-cost).

---

### D13: `sqlx` for Postgres, not `tokio-postgres` directly

- **Question**: `rusqlite` (sync, one mutex-guarded connection) was the
  right minimal choice for SQLite (D2). What's right for Postgres?
- **Evidence**: a networked database server serving concurrent requests —
  and, with multiple gateway replicas, concurrent *processes* — needs a
  real connection pool with health-checking and reconnection. That is
  fundamentally different from SQLite's single-embedded-file situation.
- **Alternatives**: `tokio-postgres` directly, hand-rolling a pool —
  rejected, reinvents well-tested infrastructure (connection lifecycle,
  health checks, backpressure) for no benefit; `sqlx` with compile-time
  `query!` macros — rejected, would require a live database connection
  just to compile this project, which conflicts with keeping the build
  reproducible without external services (the same reason `rusqlite`
  needed no such thing).
- **Decision**: `sqlx::PgPool`, using only its runtime-checked query API
  (`sqlx::query()`/`.bind()`), never the compile-time macros. `rustls`
  runtime, consistent with D7.
- **Consequence**: schema/query correctness is checked by the tests that
  actually run against a real Postgres instance, not by the compiler —
  an accepted trade-off for keeping the build dependency-free of a live
  database.

---

### D14: Postgres schema initialization race — found live, fixed with an advisory lock

- **Question**: is `CREATE TABLE IF NOT EXISTS` actually safe when
  multiple gateway replicas start simultaneously against a fresh
  database — exactly the scenario Postgres support (D12) exists for?
- **Evidence**: no — this is a well-documented Postgres limitation.
  Concurrent sessions can both pass the "does this table exist" check
  before either commits its `CREATE TABLE`, and one loses with a
  low-level catalog constraint violation (`duplicate key value violates
  unique constraint "pg_type_typname_nsp_index"`) instead of a graceful
  no-op. This was not caught by unit tests — it was caught by literally
  starting two gateway processes at once against a fresh database as a
  live test, which is exactly the deployment scenario this feature
  claims to support.
- **Alternatives**: retry on the specific error — works but is a
  workaround, not a fix, and easy to get subtly wrong (how many
  retries? what backoff?); document it as a known limitation and move on
  — rejected, this is a real correctness bug in a feature just added,
  not a pre-existing constraint to accept.
- **Decision**: serialize schema setup with `pg_advisory_lock`, held on
  one explicitly-checked-out connection (not one borrowed per-query from
  the pool, since the lock is session-scoped and would be a no-op
  otherwise) for the duration of table/index creation.
- **Consequence**: a regression test
  (`concurrent_schema_init_from_simulated_replicas_does_not_race`) runs 5
  concurrent `connect()` calls against a fresh database and asserts all
  succeed; re-running the original two-process live scenario after the
  fix showed clean startup with no errors in either process's log.

---

### D15: Provider-registration check moved before the store write

- **Question**: found live (same Postgres testing session as D14): a
  request naming an unregistered provider (e.g. `paymob` when only Fawry
  is enabled) was creating a permanent `Pending` row and permanently
  consuming that idempotency key, because the original handler called
  `store.begin_payment()` before checking whether the named provider was
  actually registered.
- **Decision**: validate the provider is registered *before* the store is
  touched at all (`handlers.rs::create_payment`).
- **Consequence**: an "unknown provider" request now leaves zero rows
  behind — reverified live (row count confirmed `0` after the fix,
  where it was `1` before).

---

### D16: Rate limiter scoped to caller-facing routes only

- **Question**: found live: applying the rate limiter as a single global
  layer meant a burst of legitimate `POST /v1/payments` traffic could
  429 an unrelated, concurrently-arriving Paymob/Fawry webhook delivery
  — the webhook has nothing to do with the caller-facing traffic that
  exhausted the bucket.
- **Decision**: the rate limiter (and the API-key auth middleware) apply
  only to `/v1/payments` and `/v1/payments/:id`. Webhooks, `/v1/health`,
  `/v1/ready`, and `/v1/version` are exempt — webhooks authenticate via
  their own provider signature scheme (§12) and must keep working under
  caller-side load; health/version must stay reachable by monitoring
  without credentials or being subject to unrelated traffic bursts.
- **Consequence**: reverified live — 8 rapid health-check requests all
  returned 200 while a 3-req/sec limit on the payments route was
  simultaneously being enforced.

---

### D17: Distributed rate limiter uses `MultiplexedConnection`, not `ConnectionManager`

- **Question**: `redis::aio::ConnectionManager` (auto-reconnecting) was
  the initially obvious choice for a long-lived cache connection.
- **Evidence**: enabling its `connection-manager` feature pulled in
  `tokio-retry`, which pulled in `rand 0.9`/`getrandom 0.4`/`rand_core
  0.10` — none of which parsed under the original pinned Rust 1.75
  toolchain (the same `edition2024` wall as D9's other pins; resolved
  by the 1.88 MSRV bump, but the `MultiplexedConnection` trade-off was
  kept).
- **Alternatives**: keep chasing pins down that entire chain — attempted
  first, cost kept growing (a `rand_core` pin alone wasn't sufficient
  because three semver-incompatible major versions of it coexist in the
  graph for different reasons); switch to `MultiplexedConnection` — no
  auto-reconnect, but the rate limiter's `try_acquire` already treats any
  connection error as "fail open, log a warning" (see
  `rate_limit.rs`), so auto-reconnect is a minor availability nicety here,
  not a correctness requirement.
- **Decision**: `MultiplexedConnection`, obtained via
  `get_multiplexed_async_connection()`.
- **Consequence**: a dropped cache connection degrades to "no rate
  limiting until the next successful call or a process restart" rather
  than an outage — an accepted trade-off, documented in
  `docs/LIMITATIONS.md`. A future version could add simple
  reconnect-on-error without pulling `ConnectionManager` back in.

---

### D18: RabbitMQ as an optional async message bus

- **Question**: should webhook ingestion and reconciliation work always
  run synchronously inside the HTTP handler / background loop, or can an
  operator offload that work to a message broker?
- **Evidence**: under burst webhook traffic, in-process handling ties
  provider-signature verification and store writes to the HTTP request
  lifecycle. Reconciliation already runs on a timer (`reconciler.rs`); an
  optional queue lets multiple gateway replicas share work without each
  replica independently hammering provider inquiry APIs.
- **Alternatives**: require a broker for all deployments — rejected,
  violates the "minimal gateway" principle (D1) and adds operational cost
  to single-instance SQLite setups; build a custom retry queue in Postgres
  — rejected, reinvents RabbitMQ's delivery guarantees for no benefit at
  this scale.
- **Decision**: optional RabbitMQ via `lapin` (`gateway/src/amqp.rs`).
  When `OPENWRAPPER_AMQP_URL` is set, verified webhooks and
  reconciliation jobs are published to dedicated queues with prefetch,
  retry, and dead-letter handling. When unset, behavior is identical to
  pre-0.1.2 in-process handlers — no broker required.
- **Consequence**: Docker Compose wires RabbitMQ by default for a
  production-shaped local stack, but operators can omit
  `OPENWRAPPER_AMQP_URL` entirely. See `docs/OPERATIONS.md` for
  `OPENWRAPPER_AMQP_*` variables.

---

### D19: PgBouncer for transaction-mode connection pooling

- **Question**: Postgres connection counts grow linearly with gateway +
  web replicas, and both stacks use drivers that cache prepared statements
  by default — incompatible with PgBouncer's transaction pooling mode.
- **Evidence**: Railway and similar platforms cap Postgres connections
  (~100). The web dashboard alone can hold 25 warm `pg` pool connections;
  multiple gateway replicas each hold a `sqlx::PgPool` (default max 20).
  Without a pooler, connection exhaustion becomes the first production
  failure mode before CPU or memory.
- **Alternatives**: raise Postgres `max_connections` — rejected, masks the
  problem and increases memory per backend; session-mode pooling only —
  rejected, holds server connections for the full client session, defeating
  the purpose for short web requests.
- **Decision**: deploy PgBouncer in **transaction mode**
  (`infra/pgbouncer/`, `edoburu/pgbouncer` image). Application URLs target
  `:6432`. Gateway appends `statement_cache_mode=describe` when connecting
  through the pooler; web sets `prepareThreshold: 0` on the `pg` `Pool`.
- **Consequence**: topology is `Postgres ← PgBouncer ← gateway + web`.
  Direct `:5432` URLs remain appropriate for one-off migrations and admin
  tooling only. See `docs/DEPLOYMENT.md` and `docs/OPERATIONS.md`.

---

### D20: Bun and Biome for unified, high-performance monorepo operations

- **Question**: should the TypeScript SDK, Next.js web application, and root
  tooling continue with fragmented package managers (npm, pnpm) and legacy linters,
  or unify under a single high-performance engine?
- **Evidence**: having multiple lockfiles (`package-lock.json`, `pnpm-lock.yaml`,
  `sdk/typescript/package-lock.json`) led to divergent dependency resolutions, slow
  CI installations, and dual toolchain management overhead. Biome executes
  full-tree monorepo validation across all JavaScript/TypeScript files in ~80ms
  (an order-of-magnitude improvement over ESLint/Prettier combinations).
- **Alternatives**: retain pnpm workspaces with ESLint and Prettier — rejected,
  requires multi-package configuration overhead and slower cold-start runs; adopt
  Deno — rejected, Next.js ecosystem and library support remains standard with
  Node/Bun runtimes.
- **Decision**: standardize the monorepo on **Bun v1.3.3 workspaces** with a unified
  root `bun.lock`, and enforce linting and formatting via **Biome 2.5.12** (`biome.json`).
  Update `web/Dockerfile` to use `oven/bun:1-alpine` for the base and builder stages,
  retaining `node:22-alpine` for Next.js standalone runtime execution.
- **Consequence**: `bun install`, `bun test`, and `bunx @biomejs/biome check .` run
  consistently across local development, CI workflows (`.github/workflows/ci.yml`),
  and production container builds. Legacy lockfiles and obsolete script
  dependencies are eliminated.

---

### D21: SQLite WAL normal synchronization and composite indexing

- **Question**: under high transaction volumes and frequent background
  reconciliation runs, how should payment state queries and SQLite disk write
  contention be optimized without sacrificing durability?
- **Evidence**: the background reconciler periodically executes
  `SELECT ... FROM payments WHERE status = 'unknown' ORDER BY updated_at ASC LIMIT ?`.
  Without a composite index, this forces a table scan or sort step as transaction
  volume grows. In SQLite WAL mode, `PRAGMA synchronous = FULL` executes redundant
  fsync operations on every transaction commit, creating disk I/O bottlenecks.
- **Alternatives**: disable SQLite WAL mode — rejected, eliminates concurrent
  read/write transactions; leave indexing to manual production DBA intervention —
  rejected, fails the zero-config out-of-the-box performance guarantee.
- **Decision**: add composite indexes `idx_payments_status_updated ON payments (status, updated_at)`
  in both SQLite and PostgreSQL schemas. Configure `PRAGMA synchronous = NORMAL;`
  on SQLite WAL mode initialization (`gateway/src/store/sqlite.rs`).
- **Consequence**: under SQLite WAL mode, `synchronous = NORMAL` ensures complete
  durability across application crashes while significantly reducing disk write
  latency, and the composite index makes reconciliation queries `O(log N)` index
  scans in both SQLite and Postgres backends.

