# Security

## TLS

Outbound: `reqwest` with the `rustls-tls` backend (not the system OpenSSL
binding — see `docs/DECISIONS.md` for why). Inbound: the gateway itself
speaks plain HTTP; running it behind a TLS-terminating reverse proxy (or
directly exposing it via a platform that terminates TLS, e.g. a managed
load balancer) is assumed and documented in `docs/OPERATIONS.md` rather
than reimplemented — terminating TLS correctly (cert rotation, ALPN,
HSTS) is exactly the kind of "established, narrow interface" work §16
says to delegate rather than hand-roll.

## Secret management

Every credential (Paymob's `secret_key`/`hmac_secret`, Fawry's
`secure_key`) is wrapped in `secrecy::Secret<String>`, sourced from
environment variables at process startup
(`gateway/src/main.rs::require_env`) — never from a CLI argument (which
leaks via `ps`/shell history) or a config file committed to source
control. `Secret`'s `Debug` implementation is redacted by the `secrecy`
crate itself, so an accidental `{:?}` of a config struct cannot leak a
credential. `expose_secret()` calls are structurally confined — see
`docs/ERROR_MODEL.md`.

## Authentication / authorization

`POST /v1/payments` and `GET /v1/payments/:id` require an API key by
default (`gateway/src/auth.rs`) — **secure by default**: the process
refuses to start unless `OPENWRAPPER_API_KEYS` is set, or an operator
explicitly opts out with `OPENWRAPPER_DISABLE_AUTH=true` (confirmed
live — see `docs/LIMITATIONS.md`). Keys are compared in constant time
(`subtle::ConstantTimeEq`), including a length-independent branch so a
timing side-channel can't distinguish "wrong length" from "right length,
wrong bytes." Multiple keys are supported (comma-separated) specifically
so a key can be rotated without downtime — issue a new key, update
traffic to use it, then remove the old one from the list, rather than a
single-key swap that has no safe transition window.

Webhooks (`/v1/webhooks/:provider`) are deliberately **not** behind this
API key — they authenticate via the provider's own signature scheme
(§12), which an operator-chosen key can't be attached to (Paymob/Fawry
don't send one). `/v1/health`, `/v1/ready`, and `/v1/version` are also
exempt, since monitoring and load balancers need them reachable without
a credential.

## Provider credential isolation

Each provider's credentials are constructed into that provider's own
`*Config` struct and never shared across adapters — there is no global
credential store. The SDKs never receive provider credentials at all
(§ARCHITECTURE.md's deployment-model discussion).

## Rate limiting

Basic abuse protection is now built in (`gateway/src/rate_limit.rs`),
applied only to the API-key-gated routes (webhooks and health checks are
exempt — see `docs/DECISIONS.md` D16, found via a live test where a
global limiter could have 429'd a legitimate webhook). Two backends:

- **In-process** (default): a token bucket, correct for a single
  instance, independent per replica if you run more than one.
- **Distributed**: a Valkey/Dragonfly-backed fixed-window counter
  (`OPENWRAPPER_CACHE_URL`), shared across replicas — live-tested with
  two gateway processes and one shared cache confirming the limit is
  enforced in aggregate, not per-replica.

Either way this remains a coarse, single global limit, not per-client
throttling — a real internet-facing deployment should still layer a
reverse proxy's or platform's own rate limiting in front (see
`docs/DEPLOYMENT.md`). The distributed backend fails **open** (allows
requests through, logs a warning) if the cache becomes unreachable,
deliberately: a rate limiter that fails closed would turn an
availability enhancement into a new single point of failure for the
entire payments API.

## Webhook verification, replay protection

See `docs/WEBHOOKS.md` in full. Summary: signature verification is
mandatory and structurally unbypassable (I7); deduplication via a
`PRIMARY KEY` table is the replay defense implemented in v0.1.0 — an
independent timestamp-window check was considered and deliberately not
added without a documented provider-supplied field to check it against
(see `docs/LIMITATIONS.md`).

## Timeout limits, resource limits

Every outbound provider HTTP client is built with a 15-second timeout
(`providers/*/src/client.rs`). The gateway itself: a 30-second
`TimeoutLayer` and a 256 KiB request body cap
(`RequestBodyLimitLayer`) — neither Paymob's nor Fawry's documented
payloads used here come close to that size; it exists to bound abuse, not
to accommodate legitimate traffic.

## Dependency security / supply chain

Every dependency is declared once, pinned, in the workspace root
`Cargo.toml`, with a comment justifying any pin that exists for a reason
beyond "latest compatible" — see `docs/DECISIONS.md` for the dependency
choices with real trade-offs (SQLite over Redis, `reqwest`/`rustls` over
alternatives, curl over Guzzle in the PHP SDK). No dependency was added
without a one-line reason in this repository's history of decisions.

## No custom cryptography

Every cryptographic primitive used is from an established crate:
`hmac`+`sha2` (Paymob HMAC-SHA512), `sha2` (Fawry SHA-256), `subtle`
(constant-time comparison), `rustls` (TLS). Nothing here implements its
own hashing, its own HMAC construction, or its own TLS. Cryptographic
operations are kept behind narrow interfaces (`signature.rs` in each
provider crate is the *only* place that constructs a signature) rather
than inlined at call sites.
