# Railway Deployment Guide

This guide explains how to deploy OpenWrapper on [Railway](https://railway.app) using either **Infrastructure as Code (IaC)** or the **Railway Web Dashboard**.

## Architecture

The checked-in IaC deploys **four services** plus a **PostgreSQL database**:

| Service | Source | Port | Description |
|---------|--------|------|-------------|
| **gateway** | Root `Dockerfile` | 8080 | Rust payment gateway engine |
| **web** | `apps/web/Dockerfile` | 3000 | Next.js dashboard & developer portal |
| **Postgres** | Railway database | 5432 | Shared database |
| **Valkey** | Container image | 6379 | Distributed gateway rate limiting |
| **RabbitMQ** | Container image | 5672 | Optional async webhook/reconciliation bus |

The **web** service communicates with the **gateway** over Railway's private network (`*.railway.internal`).

---

## Option A: Deploy via Infrastructure as Code (Recommended)

Railway's modern approach uses `.railway/railway.ts` to provision and manage the entire environment graph.

1. **Install dependencies, CLI & Login**:
   ```bash
   bun install
   bun install -g @railway/cli # or npm i -g @railway/cli
   railway login
   ```
2. **Link or Init Project**:
   ```bash
   railway link
   ```
3. **Plan Changes**:
   ```bash
   railway config plan
   ```
4. **Apply Configuration**:
   ```bash
   railway config apply
   ```

---

## Option B: Deploy via Railway Dashboard

### Step 1: Create a Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Select **Deploy from GitHub repo**
3. Connect your repository `MoustafaAt1a/openwrapper`

### Step 2: Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway will automatically provision the database and expose `DATABASE_URL` as a reference variable.

### Step 3: Configure the Gateway Service

1. Click **+ New** → **GitHub Repo** → select `openwrapper`
2. In **Settings**:
   - **Root Directory**: `/` (leave default)
   - **Builder**: Select **Dockerfile** (uses root [`Dockerfile`](file:///c:/FM/openwrapper/Dockerfile))
3. In **Variables**, add:

```env
# Required
OPENWRAPPER_BIND_ADDR=0.0.0.0:8080
OPENWRAPPER_DATABASE_URL=${{Postgres.DATABASE_URL}}
OPENWRAPPER_API_KEYS=<generate with: openssl rand -hex 32>
OPENWRAPPER_LOG_FORMAT=json

# Payment providers (set the ones you use)
OPENWRAPPER_ENABLE_PAYMOB=true
PAYMOB_SECRET_KEY=<your key>
PAYMOB_HMAC_SECRET=<your secret>
PAYMOB_PUBLIC_KEY=<your key>
PAYMOB_INTEGRATION_IDS=<your IDs>
PAYMOB_NOTIFICATION_URL=https://<your-gateway-domain>/v1/webhooks/paymob

OPENWRAPPER_ENABLE_FAWRY=true
FAWRY_MERCHANT_CODE=<your code>
FAWRY_SECURE_KEY=<your key>
FAWRY_BASE_URL=https://www.atfawry.com
```

### Step 4: Configure the Web Service

1. Click **+ New** → **GitHub Repo** → select `openwrapper` again
2. In **Settings**:
   - **Root Directory**: `apps/web`
   - **Builder**: Select **Dockerfile** (uses [`apps/web/Dockerfile`](file:///c:/FM/openwrapper/apps/web/Dockerfile))
3. In **Variables**, add:

```env
# Required
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<generate with: openssl rand -hex 32>
BETTER_AUTH_URL=https://<your-web-public-url>
OPENWRAPPER_GATEWAY_URL=http://<gateway-service-name>.railway.internal:8080

# Stripe is handled directly by the web service.
# Paymob/Fawry server credentials belong on the gateway; per-request
# credentials are forwarded to it over the private network.
STRIPE_SECRET_KEY=<your key>
STRIPE_WEBHOOK_SECRET=<your secret>
```

### Step 5: Generate Public Domains

1. For the **web** service: **Settings** → **Networking** → **Generate Domain**
2. For the **gateway** service: generate a domain only if you need external API access. Otherwise, the web service talks to it over the private network.

---

## Private Networking

Railway services communicate securely over private networking using `<service-name>.railway.internal`. Set the web service's `OPENWRAPPER_GATEWAY_URL` to:

```
http://gateway.railway.internal:8080
```

> **Note**: Replace `gateway` with your actual Railway service name if different.

---

## Gateway-canonical routing

The **web** service exposes the public developer API at `/api/v1/*`, but
**Paymob and Fawry payment logic is canonical in the Rust gateway**, not
reimplemented in Next.js:

| Provider | Handled by | Public entrypoint |
|---|---|---|
| Paymob | Rust gateway (via `OPENWRAPPER_GATEWAY_URL`) | `/api/v1/payments` on web → forwarded to `/v1/payments` on gateway |
| Fawry | Rust gateway (via `OPENWRAPPER_GATEWAY_URL`) | same |
| Stripe | Web service directly | `/api/v1/payments` on web (no gateway hop) |

`OPENWRAPPER_GATEWAY_URL` **must** be set on the web service for Paymob
and Fawry. Without it, payment creation returns `503 gateway_required`.
Provider webhooks can target either the gateway (`/v1/webhooks/:provider`)
or the web proxy (`/api/webhooks/:provider`) depending on your DNS setup;
the gateway path is canonical for signature verification and idempotency.

Per-request provider credentials (`X-Paymob-*`, `X-Fawry-*`) are
forwarded from web to gateway and must be redacted from access logs — see
`docs/SECURITY.md`.

---

## Persistent Storage (Optional)

If the gateway is configured to use SQLite instead of Postgres, you can attach a Railway Volume:

1. Go to the gateway service → **Settings** → **Volumes**
2. Click **+ New Volume**
3. Set **Mount Path** to `/app/data`
4. Set `OPENWRAPPER_DATABASE_URL=/app/data/openwrapper.sqlite3`

> For production, PostgreSQL (`OPENWRAPPER_DATABASE_URL`) is recommended.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `using build driver railpack ... railpack prepare exited with an error` | Railway defaulted to Railpack on the monorepo root. In Railway Service **Settings > Build > Builder**, change from **Railpack** to **Dockerfile**. OpenWrapper uses root [`Dockerfile`](file:///c:/FM/openwrapper/Dockerfile) for Gateway and [`apps/web/Dockerfile`](file:///c:/FM/openwrapper/apps/web/Dockerfile) for Web. |
| Gateway can't connect to Postgres | Verify `OPENWRAPPER_DATABASE_URL` uses the Railway reference `${{Postgres.DATABASE_URL}}` |
| Web can't reach gateway | Check `OPENWRAPPER_GATEWAY_URL` uses `.railway.internal` hostname |
| `fsutil.NewFS(.../snapshot-target-unpack/web): lstat .../web: no such file or directory` | The service's **Root Directory** in Railway is still set to legacy `web`. In Railway Dashboard -> Service **Settings > Source / Build > Root Directory**, change `web` to `apps/web`. |
| Gateway fails readiness | Verify `OPENWRAPPER_API_KEYS` and database/cache/AMQP references; Railway probes `/v1/ready` |

## Connection pooling

The checked-in IaC uses the Railway Postgres connection URL directly; it
does not provision PgBouncer. This is acceptable for the default single
replica, but multi-replica production deployments must budget database
connections or add a supported pooler and update both application URLs.
