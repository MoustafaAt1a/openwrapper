# Operations

## Environment variables

### Store (pick one backend)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_DATABASE_URL` | no | `openwrapper.sqlite3` | A `postgres://`/`postgresql://` URL selects the Postgres backend (required for multi-replica deployments); anything else is treated as a SQLite file path. The application does not read `OPENWRAPPER_DB_PATH`; that variable is accepted only by `infra/scripts/backup.sh`. **Production:** point at PgBouncer (`:6432`), not raw Postgres — see D19 and `docs/DEPLOYMENT.md`. When the URL contains `pgbouncer` or port `6432`, the gateway appends `statement_cache_mode=describe` automatically for transaction-mode pooling compatibility. |

### Authentication (secure by default)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_API_KEYS` | **yes**, unless `OPENWRAPPER_DISABLE_AUTH=true` | — | Comma-separated. Protects `POST /v1/payments` and `GET /v1/payments/:id`. The process refuses to start without this or an explicit opt-out. Generate with `openssl rand -hex 32`. |
| `OPENWRAPPER_DISABLE_AUTH` | no | `false` | Set `true` to explicitly run without authentication. Only appropriate for local development — never for a reachable deployment. |

### Rate limiting

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_RATE_LIMIT_PER_SEC` | no | `50` | Applies only to `/v1/payments` and `/v1/payments/:id` — webhooks and health checks are exempt (see `docs/DECISIONS.md` D16). |
| `OPENWRAPPER_CACHE_URL` | no | — | A `redis://host:port` URL to a Valkey or Dragonfly server, for sharing the rate limit across multiple gateway replicas. Without this, each replica enforces its own independent in-process limit. |

### Server

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_BIND_ADDR` | no | `127.0.0.1:8080` | Use `0.0.0.0:8080` in a container. Ignored when the platform supplies a non-empty `PORT`. |
| `PORT` | no | — | Platform-assigned port. When set, the gateway binds `0.0.0.0:<PORT>`. |
| `OPENWRAPPER_PUBLIC_WEBHOOK_BASE` | no | — | Public HTTPS base used to derive the Paymob callback URL for stateless per-request credentials when `PAYMOB_NOTIFICATION_URL` is unset. |
| `OPENWRAPPER_LOG_FORMAT` | no | `text` | Set `json` for log-aggregator-friendly structured output. |
| `RUST_LOG` | no | `info` | Standard `tracing_subscriber::EnvFilter` syntax. |
| `OPENWRAPPER_RECONCILIATION_INTERVAL_SECS` | no | `60` | How often the background loop attempts to resolve stale `Unknown` payments. `0` disables it. See `gateway/src/reconciler.rs`. |

### RabbitMQ (optional async bus)

When `OPENWRAPPER_AMQP_URL` is unset, webhooks and reconciliation run
in-process. Set the URL to enable RabbitMQ-backed async processing — see
`docs/DECISIONS.md` D18.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_AMQP_URL` | no | — | AMQP connection URL, e.g. `amqp://user:pass@rabbitmq:5672/openwrapper`. Empty/unset = in-process handlers. |
| `OPENWRAPPER_AMQP_WEBHOOK_QUEUE` | no | `openwrapper.webhooks` | Queue for async webhook event processing. |
| `OPENWRAPPER_AMQP_RECONCILE_QUEUE` | no | `openwrapper.reconciliation` | Queue for async reconciliation work items. |
| `OPENWRAPPER_AMQP_PREFETCH` | no | `1` | Consumer prefetch count (QoS). |
| `OPENWRAPPER_AMQP_MAX_RETRIES` | no | `3` | Max delivery attempts before dead-lettering. |

### Paymob

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_ENABLE_PAYMOB` | no | (disabled) | set to `true` to enable |
| `PAYMOB_SECRET_KEY` | if enabled | — | secret, never log |
| `PAYMOB_HMAC_SECRET` | if enabled | — | secret, never log |
| `PAYMOB_PUBLIC_KEY` | if enabled | — | |
| `PAYMOB_BASE_URL` | no | `https://accept.paymob.com` | test/live is determined by the secret key, not this URL |
| `PAYMOB_INTEGRATION_IDS` | if enabled | — | comma-separated integration IDs from the Paymob dashboard |
| `PAYMOB_NOTIFICATION_URL` | if enabled | — | must point at this gateway's public `/v1/webhooks/paymob` |
| `PAYMOB_INQUIRY_PATH_TEMPLATE` | no | `/api/acceptance/transactions/{id}` | override if the default (a documented guess — see `docs/LIMITATIONS.md`) turns out to be wrong |
| `PAYMOB_CHECKOUT_URL_TEMPLATE` | no | `{base_url}/unifiedcheckout/?publicKey={public_key}&clientSecret={client_secret}` | same caveat |

### Fawry

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENWRAPPER_ENABLE_FAWRY` | no | (disabled) | set to `true` to enable |
| `FAWRY_MERCHANT_CODE` | if enabled | — | |
| `FAWRY_SECURE_KEY` | if enabled | — | secret, never log |
| `FAWRY_BASE_URL` | if enabled | — | e.g. `https://atfawry.fawrystaging.com` for staging; no default for server-side configuration |
| `FAWRY_DEBUG_SIGNATURES` | no | `false` | Logs non-secret signature inputs at debug level for sandbox diagnosis; disable during routine production operation. |

Per-request `X-Fawry-*` credentials currently default to Fawry's staging URL
when `X-Fawry-Base-Url` is omitted. Send the header explicitly outside
sandbox testing.

### Stripe (Global / Cards)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | if enabled | — | Stripe API secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | if enabled | — | Webhook signing secret (`whsec_...`) |

### Web Portal & Authentication (Next.js & Better-Auth)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string for Drizzle ORM. In production, prefer `DATABASE_POOLER_URL` when PgBouncer is in use. |
| `DATABASE_POOLER_URL` | no | — | PgBouncer endpoint (`postgres://…@pgbouncer:6432/…`). Takes precedence over `DATABASE_URL` when set. |
| `BETTER_AUTH_SECRET` | yes | — | 32+ character encryption secret for session tokens |
| `BETTER_AUTH_URL` | no | `http://localhost:3000` | Public URL for authentication redirects; required by `docker-compose.prod.yml` |
| `DOMAIN` | production Compose | — | Public hostname; required by `docker-compose.prod.yml` |
| `ACME_EMAIL` | production Compose | — | Contact address used by Caddy for certificate issuance |
| `OPENWRAPPER_GATEWAY_URL` | no | `http://gateway:8080` | Bridge to Rust Gateway process |

## Running

```bash
cargo run -p openwrapper-gateway
```

Or via Docker — see `docs/DEPLOYMENT.md` for the full guide including
TLS termination, systemd, and a go-live checklist.

## Routes

| Method | Path | Auth required? | Notes |
|---|---|---|---|
| `POST` | `/v1/payments` | yes (API key) | requires `Idempotency-Key` header |
| `GET` | `/v1/payments/:id` | yes (API key) | attempts reconciliation if status is `unknown` |
| `POST` | `/v1/webhooks/:provider` | no (provider-signature-authenticated) | Rust gateway providers are `paymob` and `fawry`; Stripe is handled by the web API |
| `GET` | `/v1/health` | no | liveness — process is up, does not touch the store |
| `GET` | `/v1/ready` | no | readiness — checks the store, distributed cache, and configured AMQP connection |
| `GET` | `/v1/version` | no | `{"version": "0.1.2"}` |

API key: send as `X-API-Key: <key>` or `Authorization: Bearer <key>`.

## Database

**SQLite**: a single file, WAL mode, `busy_timeout` set for robustness
against brief external access (a backup tool, manual inspection). No
migrations tooling — schema is `CREATE TABLE IF NOT EXISTS` on startup.
Back it up like any file.

**Postgres**: schema is also `CREATE TABLE IF NOT EXISTS` on startup,
serialized across concurrent replica startups with an advisory lock (see
`docs/DECISIONS.md` D14). `infra/scripts/backup.sh` provides a small
`pg_dump`/SQLite backup helper; production operators should still monitor
and restore-test backups using their platform's native facilities.

**PgBouncer (production)**: gateway and web should connect through
PgBouncer in transaction mode, not directly to Postgres. Transaction-mode
pooling does not support server-side prepared statement caching:

- **Gateway** (`gateway/src/store/postgres.rs`): when
  `OPENWRAPPER_DATABASE_URL` targets PgBouncer (`pgbouncer` hostname or
  `:6432` port), `statement_cache_mode=describe` is appended automatically.
- **Web** (`web/lib/db/index.ts`): the `pg` pool sets
  `prepareThreshold: 0` so Drizzle/ORM queries do not use prepared
  statements that PgBouncer would reject.

Use `DATABASE_POOLER_URL` for the web service when PgBouncer and direct
Postgres URLs differ (e.g. migrations/admin on `:5432`, app traffic on
`:6432`).

## Local development infrastructure

To run the Postgres/Valkey-specific test suites locally without Docker:

```bash
# Postgres (Debian/Ubuntu)
sudo apt-get install postgresql
sudo pg_ctlcluster <version> main start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'testpass';"
sudo -u postgres createdb openwrapper_test

# Valkey (or use redis-server locally — same RESP protocol; see
# docs/DECISIONS.md for why the deployed target is Valkey/Dragonfly)
sudo apt-get install redis-server  # or install Valkey directly
redis-server --daemonize yes --port 6379

OPENWRAPPER_TEST_DATABASE_URL="postgres://postgres:testpass@127.0.0.1:5432/openwrapper_test" \
OPENWRAPPER_TEST_CACHE_URL="redis://127.0.0.1:6379" \
cargo test -p openwrapper-gateway -- --ignored
```
