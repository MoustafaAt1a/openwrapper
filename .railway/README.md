# Railway Infrastructure as Code (IaC)

Production-shaped Railway deployment for OpenWrapper v0.1.2 LTS.

## Stack

| Service | Role |
|---------|------|
| **postgres** | Shared database (Railway plugin — includes built-in pooling) |
| **valkey** | Distributed rate limiting for gateway replicas |
| **rabbitmq** | Optional async webhook/reconciliation bus (`OPENWRAPPER_AMQP_URL`) |
| **gateway** | Rust payment engine (`:8080`) |
| **web** | Next.js dashboard + Stripe API (`:3000`) |

Paymob and Fawry payments flow through the gateway over private networking (`gateway.railway.internal`). The web service only needs Stripe credentials for card checkout.

## Prerequisites

```bash
npm i -g @railway/cli
railway login
railway link
```

## Deploy

```bash
npm run railway:plan    # preview changes
npm run railway:apply   # apply configuration
```

## Required secrets (set in Railway dashboard)

- `OPENWRAPPER_API_KEYS` — gateway API keys (comma-separated)
- `BETTER_AUTH_SECRET` — 32+ character random string for web sessions
- `BETTER_AUTH_URL` — public web URL (e.g. `https://your-app.up.railway.app`)
- `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` — if using RabbitMQ
- `OPENWRAPPER_AMQP_URL` — e.g. `amqp://user:pass@rabbitmq.railway.internal:5672/openwrapper`
- Provider keys as needed (`PAYMOB_*`, `FAWRY_*`, `STRIPE_*`)

## Healthchecks

- Gateway: `GET /v1/ready` (database + cache + optional AMQP)
- Web: `GET /api/v1/health`

## Notes

- Railway Postgres has built-in connection pooling — no PgBouncer sidecar needed.
- PgBouncer in `infra/pgbouncer/` is for Docker Compose and Kubernetes only.
