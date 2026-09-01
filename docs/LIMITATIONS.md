# Known limitations

v0.1.0 is "first experimentally validated foundation," not a complete
payment platform (§27). This file is the honest accounting of what that
means in practice — what's unverified, what's deliberately deferred, and
what would need to change before production use.

## Unverified against a live provider sandbox

This project had no Paymob or Fawry merchant sandbox credentials
available. Everything below was built from fetched primary documentation
(cited in `research/paymob.md` and `research/fawry.md`) and, where noted,
from convergent-but-incomplete secondary evidence. **Confirm these against
a live sandbox account before production use:**

- **Paymob's transaction inquiry endpoint** (`inquire_transaction` in
  `providers/paymob/src/client.rs`): the project's own navigation
  confirmed a "Transaction Inquiry API" exists, but the specific
  reference page did not load during research. The implemented path
  follows the long-documented "classic Accept API" shape used by several
  third-party Paymob SDKs, not a freshly confirmed official page.
- **Paymob's Unified Checkout redirect URL** (`unified_checkout_url` in
  the same file): built from the documented *purpose* of `client_secret`
  ("used to redirect the customer to Paymob's Unified Checkout") rather
  than a freshly fetched page showing the literal URL pattern.
- **Paymob's `billing_data` required subfields**
  (`providers/paymob/src/client.rs`): only `phone_number` was confirmed
  required from fetched documentation; the adapter sends placeholder
  values for `apartment`/`floor`/`street`/etc. rather than omitting them,
  to avoid an undocumented validation failure — this should be revisited
  once real request/response pairs are available.
- **Fawry's PayAtFawry charge-request signature field list**
  (`charge_signature` in `providers/fawry/src/signature.rs`): reconstructed
  from a truncated documentation excerpt (a PHP code sample whose final
  lines could not be retrieved), consistent with the pattern used by
  Fawry's other signed endpoints. **This is the single highest-risk
  unverified detail in this codebase** — an incorrect field order here
  would make every real Fawry charge attempt fail with a signature error.
  Confirm via Fawry's own Signature Tool
  (`developer.fawrystaging.com/public/signatureTool`) before any live
  call.
- **Fawry notification `Content-Type`** (`providers/fawry/src/webhook.rs`):
  assumed to be JSON based on the documented field shapes (nested
  objects), not a captured real delivery.

What *was* directly fetched and is implemented with high confidence:
Paymob's Create Intention request/response shape, Paymob's HMAC-SHA512
field order and algorithm for the transaction-processed callback, Fawry's
Get Payment Status V2 signature, and Fawry's Server Notification V2
signature — see `research/*.md` for the exact citations.

## Deliberately out of scope for v0.1.0

- **No Refund/Capture/Authorize capability.** Neither adapter implements
  these; `Capability` doesn't even have variants for them (§9). A payment
  that is later refunded at Fawry maps to `Succeeded` (the charge did
  happen) rather than a distinct state — see `providers/fawry/src/status.rs`.
- **No smart routing between providers.** The caller always names a
  provider explicitly. §3 rules this out for v0.1.0 regardless.
- **Background reconciliation is minimal, not a platform.** A
  `tokio::spawn` loop in `gateway/src/reconciler.rs` periodically
  re-inquires stale `Unknown` payments (configurable via
  `OPENWRAPPER_RECONCILIATION_INTERVAL_SECS`; `0` disables it). This is
  still not a full reconciliation platform — no separate scheduler
  service, no operator dashboard, no cross-merchant reporting. When
  `OPENWRAPPER_AMQP_URL` is set, reconciliation work can be published to
  RabbitMQ for async processing (`gateway/src/amqp.rs`); without it,
  reconciliation runs in-process. §13's warning against building
  reconciliation infrastructure *prematurely* still applies: what exists is
  a bounded loop easy to delete if real usage feedback says it's the wrong
  shape.
- **No caller-facing authentication on the gateway's own HTTP API.**
  ~~See `docs/SECURITY.md` — the assumed deployment is behind a network
  boundary the merchant controls, not directly internet-facing.~~
  **Resolved**: API-key authentication is now enforced by default (the
  process refuses to start without one, or an explicit opt-out) — see
  `docs/SECURITY.md` and `gateway/src/auth.rs`.
- **No inbound rate limiting on the gateway.** ~~Left to the deployment's
  reverse proxy.~~ **Partially resolved**: a basic rate limiter is now
  built in (in-process by default, Valkey/Dragonfly-backed for
  multi-replica deployments — see `gateway/src/rate_limit.rs`). Still
  coarser than a real API gateway's per-client throttling; a reverse
  proxy or platform layer in front remains recommended for internet-
  facing deployments (`docs/DEPLOYMENT.md`).
- **Single-process idempotency store.** ~~SQLite's `UNIQUE` constraint
  correctly serializes concurrent callers within one gateway process, but
  the store does not coordinate multiple gateway replicas sharing one
  file. Running more than one gateway instance is not a supported
  configuration.~~ **Resolved**: a Postgres backend
  (`gateway/src/store/postgres.rs`) is now available specifically for
  multi-replica deployments, selected via `OPENWRAPPER_DATABASE_URL`. The
  same `UNIQUE`-constraint mechanism that made SQLite's single-process
  idempotency correct was proven to hold across genuinely independent
  connections/processes against a real local Postgres instance,
  including a regression test for a real concurrent-schema-init race
  found and fixed along the way (`docs/DECISIONS.md` D14). SQLite remains
  the default and is still the right choice for a single instance.
- **The distributed rate limiter has no auto-reconnect.** If the
  Valkey/Dragonfly connection drops, the limiter fails open (allows
  requests through, logs a warning) rather than closed, until the next
  successful call or a process restart — an accepted trade-off to avoid
  a heavy transitive dependency chain incompatible with this sandbox's
  Rust toolchain (`docs/DECISIONS.md` D17). Not a security hole (failing
  open on a rate *limiter* is the safer failure direction — see the code
  comment in `rate_limit.rs`), but worth knowing about if you're relying
  on the distributed limiter for strict enforcement.
- **No replay-window check independent of dedup.** See
  `docs/WEBHOOKS.md` — deduplication makes a *replayed genuine* delivery
  a no-op, but there's no separate timestamp-staleness check, because
  neither provider's documentation used here specified a field to check
  it against.
- **No automated "no unwrap() in production code" architecture test.**
  Considered and rejected: a blanket check would false-positive on
  legitimate infallible uses (e.g. `Duration::from_secs`, static-string
  parsing) at a rate that would erode trust in the whole suite of
  architecture tests faster than it would catch a real bug. Left as a
  manual code-review property instead — see `docs/ERROR_MODEL.md`.

## Sandbox artifacts (not real project limitations)

- Rust dependency versions are pinned below their latest releases because
  this development sandbox's Rust toolchain (1.75, via `apt`) can't parse
  newer crates' `edition = "2024"` manifests — see `docs/DECISIONS.md` D9.
  A real development environment with current Rust wouldn't need these
  pins.
- The PHP SDK's test suite runs against a hand-rolled ~40-line assertion
  harness instead of PHPUnit, because this sandbox has no network access
  to `packagist.org` — see `docs/DECISIONS.md` D11.
- `cargo clippy` was not run — the `clippy` rustup component isn't
  installable in this sandbox (same `rustup`-domain restriction as D9).
  All code was still written to idiomatic-Rust conventions and reviewed
  by hand; running `cargo clippy --workspace` in a normal environment
  before merging is recommended.

## What genuinely was verified, end-to-end, in this project

To be equally clear about the other side of this: the following were not
just written but actually executed and observed —

- 44 automated tests passing across the Rust workspace by default
  (core: 13, Paymob adapter: 3, Fawry adapter: 12, gateway: 10,
  architecture: 6), plus 6 more `#[ignore]`d-by-default tests requiring
  live infrastructure, all of which were actually run against real local
  instances during development: 5 against a real PostgreSQL 16 server
  (including a concurrent-connections idempotency test and a
  concurrent-schema-init regression test), 1 against a real
  Redis-protocol server standing in for Valkey/Dragonfly.
- 6 TypeScript SDK tests passing against a real strict-mode (`strict`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) compiled build.
- 7 PHP SDK tests passing under PHP 8.3.
- Multiple live runs of the actual gateway binary, including:
  - A real HTTP round-trip that hit this sandbox's network egress block
    calling Paymob's real domain, correctly producing `status: "unknown"`
    (not `"failed"`) — and a same-idempotency-key retry against that live
    process correctly returning the existing record without a second
    provider call.
  - Two gateway processes started **simultaneously** against the same
    fresh Postgres database and the same Valkey/Redis-protocol cache,
    simulating a real multi-replica deployment: both started cleanly,
    both answered `/v1/ready`, and a rate limit configured for 3 req/sec
    was correctly shared across both processes (confirmed via a 429 on
    the second replica after the first exhausted the shared bucket).
  - Fail-closed startup behavior confirmed: the process refuses to start
    with no API key configuration, and refuses to start with an
    `OPENWRAPPER_API_KEYS` value that resolves to zero usable keys.
  - Graceful shutdown confirmed via an actual `SIGTERM` to a running
    process.
  - Rate limiting confirmed scoped correctly: 8 rapid `/v1/health`
    requests all returned 200 while the payments route was
    simultaneously enforcing a 3 req/sec limit.
- Two real bugs were found and fixed specifically *because* of this live
  testing, not caught by unit tests alone (see `docs/DECISIONS.md` D14
  and D15) — a Postgres schema-initialization race under concurrent
  replica startup, and an unknown-provider request permanently consuming
  an idempotency key before validation ran.
- An architecture-test invariant (core has no provider dependency) was
  deliberately, temporarily violated and confirmed to make the test
  suite fail, then reverted — proving the test isn't vacuous.
