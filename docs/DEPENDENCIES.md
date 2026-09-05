# Rust dependency pins

Every third-party crate used by the Rust workspace is declared once in the
root [`Cargo.toml`](../Cargo.toml) `[workspace.dependencies]` table and
referenced from member crates with `*.workspace = true`. `Cargo.lock` pins
the resolved graph; exact `=` constraints are used only where the MSRV
requires them. This file records the rationale.

**Toolchain context:** `rust-version = "1.88"` is the declared MSRV and is
used by CI and the gateway builder image. Rust 1.85+ added support for
`edition = "2024"`, so the previous `=x.y.z` ceiling pins are no longer
required for correctness; versions are kept as caret requirements so
security updates flow via `Cargo.lock` and `cargo update`. See
[`docs/DECISIONS.md`](DECISIONS.md) D9.


## Serialization & core types

| Crate | Version | Rationale |
|---|---|---|
| `serde` | `1` + `derive` | De facto Rust serialization; used workspace-wide for JSON API contracts and provider payloads. |
| `serde_json` | `1` + `arbitrary_precision` | JSON for HTTP bodies. `arbitrary_precision` preserves a JSON number's original digit text (e.g. Fawry's `100.00`) without constructing `f64` — see D8. |
| `thiserror` | `1` | Ergonomic `#[derive(Error)]` for `OpenWrapperError` and adapter-local errors. |
| `async-trait` | `0.1` | `Provider` and `PaymentStore` are async traits; this is the standard, minimal way to express them today. |
| `ulid` | `1` + `serde` | Sortable, URL-safe payment IDs (`PaymentId::new`). |
| `time` | `0.3` + serde/formatting/parsing | RFC 3339 timestamps in the store and webhook pipeline. Previously pinned to `=0.3.36` for rustc 1.75 (D9); now tracks `0.3` on MSRV 1.88. |

## Async runtime & HTTP server

| Crate | Version | Rationale |
|---|---|---|
| `tokio` | `1` (rt-multi-thread, macros, time, sync, signal, net) | Async runtime for the gateway, provider HTTP clients, reconciler, and AMQP consumers. |
| `axum` | `0.7` | Minimal HTTP router for the four gateway routes; pairs naturally with `tower` middleware. |
| `tower` | `0.4` | Middleware composition (auth, rate limit layering). |
| `tower-http` | `0.5` (trace, limit, timeout) | Request tracing (method/path only — no headers), body size cap, and global timeout layer. |
| `tracing` | `0.1` | Structured application logging. |
| `tracing-subscriber` | `0.3` + env-filter (+ json in gateway) | Log filtering via `RUST_LOG`; JSON output for production aggregators. |

## Outbound HTTP & TLS

| Crate | Version | Rationale |
|---|---|---|
| `reqwest` | `0.11` + json, **rustls-tls** (no default features) | Provider HTTP client. `rustls-tls` avoids a system OpenSSL dependency and keeps TLS behavior reproducible across environments — see D7. |

## Cryptography

| Crate | Version | Rationale |
|---|---|---|
| `hmac` | `0.12` | Paymob HMAC-SHA512 and Stripe HMAC-SHA256 webhook verification. |
| `sha2` | `0.10` | SHA-256 for Fawry signatures and API-key hashing. |
| `hex` | `0.4` | Hex encoding of digests in signature comparisons. |
| `secrecy` | `0.8` + serde | Wraps provider credentials; redacted `Debug` output — see [`docs/SECURITY.md`](SECURITY.md). |
| `zeroize` | `1.7` | Transitive via `secrecy`; previously pinned to `=1.7.0` for `edition = "2024"` (D9), now caret on MSRV 1.88. |

## Persistence

| Crate | Version | Rationale |
|---|---|---|
| `rusqlite` | `0.31` + bundled | Default single-instance store. `bundled` vendors SQLite — no system package required. |
| `sqlx` | `0.8` + runtime-tokio-rustls, postgres, time (no default features) | Postgres backend with a real connection pool for multi-replica deployments — see D12/D13. Runtime-checked queries only (no `query!` macros) so the build does not require a live database. |

## Caching & messaging

| Crate | Version | Rationale |
|---|---|---|
| `redis` | `0.25` + tokio-comp (no default features) | RESP client for Valkey/Dragonfly distributed rate limiting. Not a dependency on Redis-the-server — any RESP-compatible cache works. Uses `MultiplexedConnection`, not `ConnectionManager`, to avoid a transitive pin chain that was incompatible with the original rustc 1.75 (see D17) — retained for simplicity. |
| `lapin` | `4.10.0` + rustls, rustls--ring, tokio (no default features) | Optional RabbitMQ client for async webhook processing and reconciliation fan-out — see D18 and `gateway/src/amqp.rs`. Upgraded from `=2.3.0` (MSRV 1.75 ceiling) to `4.10.0` (MSRV 1.88) with `ring` + `tokio` to avoid cmake/aws-lc-sys build requirement. |
| `futures-util` | `0.3` + std | Stream utilities for AMQP consumer loops. |

## High-Throughput gRPC & GraphQL

| Crate / Package | Version | Rationale |
|---|---|---|
| `tonic` | `0.12` + transport, codegen, prost | High-throughput gRPC server in `apps/gateway` providing sub-millisecond binary IPC over HTTP/2. |
| `prost` | `0.13` | High-performance, zero-allocation Protocol Buffers implementation for Rust. |
| `tonic-build` | `0.12` | Build-time code generator compiling canonical definitions from `proto/openwrapper/v1/payment.proto`. |
| `graphql` (npm) | `17.0` | Official reference GraphQL execution engine in Next.js (`apps/web`), providing zero-overhead, zero-bloat ledger querying. |


## Transitive dependencies (previously pinned for toolchain ceiling)

These crates were previously pinned with `=` to `edition = "2024"` ceilings
on rustc 1.75. On MSRV 1.88 they are caret requirements; `Cargo.lock` still
pins the resolved graph for reproducible builds (`cargo build --locked`).

| Crate | Version | Notes |
|---|---|---|
| `url` | `2.5` | Previously `=2.5.2`; now `2.5` (tracks `idna_adapter`/`icu_*`). |
| `idna` | `0.5` | Previously `=0.5.0`; now `0.5`. |
| `indexmap` | `2.2` | Previously `=2.2.6`; now `2.2`. |
| `base64ct` | `1.6` | Previously `=1.6.0`; now `1.6`. |
| `home` | `0.5` | Previously `=0.5.9`; now `0.5`. |
| `crc` | `3.0` | Previously `=3.0.1`; now `3.0`. |

## What is intentionally *not* a dependency

- **No OpenSSL / native-tls** — `rustls` only (D7).
- **No ORM** — hand-written SQL in `store/sqlite.rs` and `store/postgres.rs`.
- **No message broker requirement** — RabbitMQ is optional; the gateway runs in-process handlers when `OPENWRAPPER_AMQP_URL` is unset.
- **No dedicated Valkey/Dragonfly crate** — the `redis` crate speaks RESP to any compatible server.
