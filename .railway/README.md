# Railway Infrastructure as Code (IaC)

Production-shaped Railway deployment for OpenWrapper v0.1.3 LTS.

## Stack

| Service | Role |
|---------|------|
| **postgres** | Shared database (Railway database service) |
| **valkey** | Distributed rate limiting for gateway replicas |
| **rabbitmq** | Optional async webhook/reconciliation bus (`OPENWRAPPER_AMQP_URL`) |
| **gateway** | Rust payment engine (`:8080`) |
| **web** | Next.js dashboard + Stripe API (`:3000`) |

Paymob and Fawry payments flow through the gateway over private networking (`gateway.railway.internal`). The web service only needs Stripe credentials for card checkout.

## Prerequisites

```bash
npm ci                  # installs the Railway IaC library
npm i -g @railway/cli   # installs the Railway CLI
railway login
railway link
```

## Deploy

```bash
npm run railway:plan    # preview changes
npm run railway:apply   # apply configuration
```

## Required secrets (set in Railway dashboard)

- `OPENWRAPPER_API_KEYS` — gateway API keys (comma-separated). Set this before the first deployment; never rely on a log-emitted bootstrap credential.
- `BETTER_AUTH_SECRET` — 32+ character random string for web sessions (required at **runtime**, not during Docker build)
- `BETTER_AUTH_URL` — public web URL (e.g. `https://your-app.up.railway.app`)
- `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` — RabbitMQ credentials (on the `rabbitmq` service)
- `AMQP_URL` — on `rabbitmq`, composed from its own vars (see `.railway/railway.ts`)
- `OPENWRAPPER_AMQP_URL` — on `gateway`, set to `${{rabbitmq.AMQP_URL}}` so Railway draws the dependency link
- Provider keys as needed (`PAYMOB_*`, `FAWRY_*`, `STRIPE_*`)

## Healthchecks

- Gateway: `GET /v1/ready` (database + cache + optional AMQP)
- Web: `GET /api/v1/health`

## Notes

- The IaC currently connects applications directly to Railway Postgres. For
  sustained multi-replica traffic, add a supported pooler and point both
  application services at it; do not assume the database endpoint pools
  connections.
- PgBouncer in `infra/pgbouncer/` is wired by Docker Compose and can be
  deployed separately for Kubernetes or other platforms.
