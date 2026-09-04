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

Server-configured credentials (Paymob's `secret_key`/`hmac_secret`,
Fawry's `secure_key`) are wrapped in `secrecy::Secret<String>` and sourced
from environment variables at process startup — never from CLI arguments
or committed configuration. Stateless mode also accepts credentials in
request headers; those values are wrapped immediately but necessarily
exist in the caller, TLS terminator, and request memory. `Secret`'s `Debug` implementation is redacted by the `secrecy`
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

### gRPC & GraphQL Authentication

- **gRPC (`openwrapper.v1.PaymentGateway`)**: Protected by the identical API-key
  rules. Clients supply `x-api-key` or `authorization: Bearer <key>` in gRPC request
  metadata. Keys are validated in constant time via `subtle::ConstantTimeEq`. Unauthenticated
  calls receive `Status::unauthenticated`.
- **GraphQL (`/api/graphql`)**: Authenticated via Better Auth user sessions (cookies)
  or API keys (`Authorization: Bearer <key>` / `X-API-Key`). Resolvers strictly scope
  all ledger mutations and telemetry queries to the authenticated `userId`, guaranteeing
  merchant tenant isolation and preventing unauthorized record discovery.

## Provider credential isolation

Each provider's credentials are constructed into that provider's own
`*Config` struct and never shared across adapters — there is no global
credential store. In stateless mode, trusted server-side SDKs may supply
provider credentials per request; clients must never expose these values
to browsers or untrusted intermediaries.

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

## Per-request provider credential headers

In stateless zero-storage mode, merchants may pass provider credentials
via HTTP headers instead of environment variables. The web portal forwards
matching headers to the Rust gateway (`web/lib/gateway-bridge.ts`):
`x-paymob-*`, `x-fawry-*`, and `x-stripe-*` prefixes.

### Headers that carry secrets

| Header family | Examples | Sensitivity |
|---|---|---|
| `X-Paymob-*` | `X-Paymob-Secret-Key`, `X-Paymob-Hmac-Secret`, `X-Paymob-Public-Key` | Secret key and HMAC secret are credentials; public key is lower risk but still tenant-specific. |
| `X-Fawry-*` | `X-Fawry-Secure-Key`, `X-Fawry-Merchant-Code` | Secure key is a credential; merchant code is identifying but not secret on its own. |
| `X-Stripe-*` | `X-Stripe-Secret-Key` | Full API secret. |

Treat **every** `X-Paymob-*` and `X-Fawry-*` header as potentially
sensitive in access logs unless you have verified the specific header is
non-secret. When in doubt, redact the whole prefix.

### Credential header redaction (operators)

These headers **must not** appear in reverse-proxy access logs, APM trace
attributes, or log-shipping pipelines. Configure redaction at every layer
that records HTTP headers:

- **Caddy** (`infra/caddy/Caddyfile`): the maintained configuration deletes
  the complete request-header object from access logs. Preserve that
  filter if you customize the log encoder.
- **Nginx**: `map` + `proxy_set_header` will not help after the fact —
  use `log_format` with a custom variable that omits sensitive headers, or
  a `access_log` pipeline filter.
- **Cloud load balancers / API gateways**: enable header redaction rules
  for the prefixes above (most platforms support wildcard header deny
  lists).

Minimum redaction set (always):

- `X-Paymob-Secret-Key`, `X-Paymob-Hmac-Secret`
- `X-Fawry-Secure-Key`
- `X-Stripe-Secret-Key`

### Application-layer protections

- The gateway's HTTP trace layer (`tower-http::trace`) logs **method and
  path only** — never request headers.
- `secrecy::Secret` wraps environment-sourced credentials; accidental
  `{:?}` on config structs is redacted.
- The web dashboard does not persist per-request credential headers in
  Postgres; they exist only for the lifetime of the forwarded gateway
  request.
