# Architecture

## What OpenWrapper is

One API over Paymob and Fawry. It is an integration/abstraction layer, not
a payment processor:

- It never holds customer funds.
- It never implements payment authorization itself — Paymob and Fawry do.
- It never stores or unnecessarily receives card numbers or CVV/CVC. Both
  integrated flows (Paymob Unified Checkout, Fawry PayAtFawry) route card
  entry, if any, entirely on the provider's own hosted surface.
- It does not invent payment semantics that belong to providers — see
  "Lossless abstraction" below.

## Shape

```
                    OpenWrapper Core
                   (domain model, state
                    machine, error model,
                    idempotency contract,
                    provider contract)
                          │
                    Provider Contract
                    /               \
               Paymob               Fawry
             (adapter)             (adapter)
                    \               /
                   Gateway (HTTP + SQLite)
                    /               \
         TypeScript SDK          PHP SDK
```

`core` depends on nothing provider-specific. Both provider crates depend
on `core` and implement its `Provider` trait. `gateway` depends on `core`
and both provider crates, and is the only crate with a database driver or
an HTTP server. The two SDKs depend on nothing in this repository at
runtime — they're HTTP clients against the gateway's JSON contract.

This is enforced, not just documented: `tests/architecture` fails the
build if `core`'s manifest or its resolved `Cargo.lock` dependency graph
ever gains a dependency on either provider crate, or if a provider crate
ever depends on the gateway.

## Deployment model (§4)

Three models were on the table: a plain library/SDK, an embedded Rust
service, or a standalone HTTP gateway. **We chose a standalone HTTP
gateway** — but a genuinely minimal one (four routes, no service mesh, no
message broker), not a "microservice" in the sense §3 rules out.

**Why not just a library?** The TypeScript and PHP SDKs need to consume
the same logic the Rust core implements — HMAC/SHA-256 signature
verification, the idempotency store, the state machine. A pure-library
model would mean either (a) reimplementing signature verification and
idempotency logic three times, once per language — precisely the kind of
duplicated, driftable security-critical logic this project exists to
avoid — or (b) FFI bindings (WASM, native addons, a PHP extension) into
the Rust core from each language. WASM is explicitly out of scope
absent a concrete justification (§18), and per-language native FFI
multiplies the build/security surface for comparatively little benefit at
this scale (§32: fewer moving parts). An HTTP boundary is a well-understood,
already-secured (TLS), single implementation both SDKs can share.

**Why does that not make this a "distributed system"?** One process, one
store, no coordination between replicas required for the invariants
v0.1.0 promises when running a single instance (SQLite — see
`docs/DECISIONS.md` D2). For anyone who does want more than one replica
for availability, a Postgres backend is available (`docs/DECISIONS.md`
D12) — but note carefully what that does and doesn't add: it's still one
database, still no message broker, no service mesh, no plugin loader.
Multiple gateway processes sharing one Postgres instance is "more copies
of the same simple thing pointed at a shared database," not a
distributed system in the sense §3 warns against. This was proven, not
just designed: two gateway processes were started simultaneously against
a fresh Postgres database and a shared Valkey cache in this project's own
testing, confirming both clean concurrent startup (after fixing a real
schema-initialization race — see D14) and a correctly shared rate limit
across both.

Nothing here talks to a message broker. The one cache dependency
(Valkey/Dragonfly) exists solely to keep the rate limiter meaningful
across replicas — see `docs/DECISIONS.md` and `gateway/src/rate_limit.rs`
for why that's the one narrow, justified use, not general-purpose
caching creeping in.

**A secondary, non-obvious benefit**: putting the HTTP boundary between
the SDKs and the providers means provider credentials (Paymob's secret
key, Fawry's secure key) live only on the gateway process, never in a
browser or a PHP app's environment — a real security improvement over an
SDK-embeds-the-provider-keys model, achieved as a side effect of the
architecture rather than as a bolted-on policy.

## The provider contract (§5, §9)

A provider adapter owns: authentication, provider requests/responses,
provider errors, webhook verification, and its own configuration. Adding
a third provider means writing a new crate that implements
`openwrapper_core::Provider` and registering it in the gateway's provider
map (`gateway/src/state.rs`) — nothing in `core` changes.

"Plugin", for v0.1.0, means exactly this: a provider adapter implementing
a stable, compile-time trait (§6). Not dynamic loading, not WASM, not a
plugin marketplace.

### Capabilities (§9)

`Capability` is a closed enum containing only what's implemented:
`CreatePayment`, `InquireStatus`, `Webhook`. There is deliberately no
`Refund`/`Capture`/`Authorize` — v0.1.0 doesn't implement them, so they
don't exist as capabilities a caller could mistakenly believe are
supported. `Provider::ensure_capability` returns
`OpenWrapperError::UnsupportedCapability` explicitly rather than any
adapter silently emulating behavior a provider doesn't really have (I10).

## Lossless abstraction (§8)

Two places where OpenWrapper deliberately does *not* force a shared shape
onto genuinely different provider behavior:

- **`PaymentNextAction`** (`core/src/payment.rs`): Paymob hands back a
  `client_secret` to redirect the customer to a hosted checkout page;
  Fawry hands back a reference code the customer pays at a kiosk/ATM/wallet
  app days later. Both are "what the customer does next", so that much is
  unified as one type — but the *shape* of the action is preserved as two
  distinct variants (`RedirectToUrl`, `PayAtReference`) rather than
  flattened into one generic "checkout URL" field that would misrepresent
  Fawry's flow.
- **`ProviderReference`** (`core/src/ids.rs`): documented as an opaque
  per-provider handle rather than a fixed shape. The Fawry adapter
  deliberately stores its own `merchantRefNumber` there (not Fawry's
  `fawryRefNumber`) because that's what Fawry's status-inquiry API is
  keyed on — see `providers/fawry/src/lib.rs`'s module docs for the full
  reasoning. Core treats the value as opaque either way, so this is a
  legitimate per-adapter decision, not an abstraction leak.

## Architectural invariants (§23)

These are treated as laws, not guidelines. Where there's an automated
test enforcing one, it's named; where enforcement is structural (a type
that makes the violation impossible to express), that's noted instead.

| # | Invariant | How it's enforced |
|---|---|---|
| I1 | Core never depends on provider implementation | `tests/architecture::core_manifest_declares_no_provider_dependency` + `resolved_dependency_graph_confirms_core_has_no_provider_dependency` |
| I2 | Provider code cannot redefine core payment semantics | `PaymentStatus`/`PaymentRequest`/`PaymentResult` are defined once in core; adapters only ever construct them, never define alternates |
| I3 | Provider-specific behavior stays inside adapters | Structural: Paymob/Fawry-specific types (`CreateIntentionRequest`, `ChargeResponse`, ...) are private to their crates |
| I4 | Financial amounts never use floating point | `Money` stores `i64` minor units; no `f64` anywhere in its public API (`core/src/money.rs` tests) |
| I5 | Unknown outcomes never automatically become Failed | `PaymentStatus::validate_transition` has no path from `Unknown`/ambiguous to `Failed` except through an authoritative resolution; `OpenWrapperError::is_definite_non_occurrence` is the gateway's concrete Failed-vs-Unknown decision — live-tested against a real blocked network call, see `docs/LIMITATIONS.md` |
| I6 | Financial operations are never blindly retried | The idempotency store returns the *existing* record on a retried key rather than re-invoking the provider — live-tested, see `docs/IDEMPOTENCY.md` |
| I7 | Webhooks cannot mutate state before verification | `Provider::verify_and_parse_webhook` is the only way to obtain a `WebhookEvent`; there is no constructor for it that skips verification |
| I8 | Sensitive secrets never enter logs | `tests/architecture::secret_exposure_is_confined_to_known_call_sites` |
| I9 | SDKs cannot expose provider internals accidentally | `tests/architecture::sdk_sources_never_reference_provider_secret_field_names`; SDKs never receive provider credentials at all (deployment model) |
| I10 | Unsupported capabilities fail explicitly | `Provider::ensure_capability` |
| I11 | Public contract changes require tests | Process rule — see `docs/DECISIONS.md` |
| I12 | External calls always have explicit timeout/error semantics | Every `reqwest::Client` is built with `.timeout(...)`; every provider HTTP call maps errors into `OpenWrapperError` variants, never a bare panic |
| I13 | Every payment state transition is validated | `tests/architecture::only_the_store_module_issues_sql_against_the_payments_table` + `PaymentStatus::validate_transition` called on every write path in `store.rs` |
| I14 | No component without a documented responsibility | Every module has a doc comment stating its one job |
| I15 | No production feature without an acceptance criterion | See `docs/DECISIONS.md` and `docs/LIMITATIONS.md` for what was *not* built and why |

## One developer can understand this

The entire Rust workspace is ~10 small crates, each under a few hundred
lines, each with a one-sentence responsibility in its module doc comment.
There's one HTTP process, one SQLite file, no message broker, no service
mesh, no plugin loader. A developer can read `core/src/payment.rs` start
to finish in a few minutes and know the entire state machine.
