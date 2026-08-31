# Railway Deployment Guide

This guide explains how to deploy OpenWrapper on [Railway](https://railway.app).

## Architecture

OpenWrapper deploys as **two services** on Railway plus a **PostgreSQL database**:

| Service | Source | Port | Description |
|---------|--------|------|-------------|
| **gateway** | Root `Dockerfile` | 8080 | Rust payment gateway engine |
| **web** | `web/Dockerfile` | 3000 | Next.js dashboard & developer portal |
| **Postgres** | Railway Plugin | 5432 | Shared database |

The **web** service communicates with the **gateway** over Railway's private network (`*.railway.internal`).

---

## Step 1: Create a Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Select **Deploy from GitHub repo**
3. Connect your fork of `MoustafaAt1a/openwrapper`

## Step 2: Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway will automatically provision the database and expose `DATABASE_URL` as a reference variable.

## Step 3: Configure the Gateway Service

1. Click **+ New** → **GitHub Repo** → select `openwrapper`
2. In **Settings**:
   - **Root Directory**: `/` (leave empty / default)
   - Railway will auto-detect `railway.toml` and use the root `Dockerfile`
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

## Step 4: Configure the Web Service

1. Click **+ New** → **GitHub Repo** → select `openwrapper` again
2. In **Settings**:
   - **Root Directory**: `web`
   - Railway will auto-detect `web/railway.toml` and use `web/Dockerfile`
3. In **Variables**, add:

```env
# Required
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<generate with: openssl rand -hex 32>
BETTER_AUTH_URL=https://<your-web-public-url>
OPENWRAPPER_GATEWAY_URL=http://<gateway-service-name>.railway.internal:8080

# Payment provider keys (same as gateway, for direct provider API calls)
PAYMOB_SECRET_KEY=<your key>
PAYMOB_HMAC_SECRET=<your secret>
PAYMOB_PUBLIC_KEY=<your key>
PAYMOB_INTEGRATION_IDS=<your IDs>
PAYMOB_NOTIFICATION_URL=https://<your-web-domain>/api/v1/webhooks/paymob
FAWRY_MERCHANT_CODE=<your code>
FAWRY_SECURE_KEY=<your key>
FAWRY_BASE_URL=https://www.atfawry.com
STRIPE_SECRET_KEY=<your key>
STRIPE_WEBHOOK_SECRET=<your secret>
```

## Step 5: Generate Public Domains

1. For the **web** service: **Settings** → **Networking** → **Generate Domain**
2. For the **gateway** service: generate a domain only if you need external API access. Otherwise, the web service talks to it over the private network.

## Step 6: Deploy

Push to your `main` branch — Railway automatically builds and deploys both services.

---

## Private Networking

Railway services can communicate over a private network using `<service-name>.railway.internal`. Set the web service's `OPENWRAPPER_GATEWAY_URL` to:

```
http://gateway.railway.internal:8080
```

> **Note**: Replace `gateway` with your actual Railway service name if different.

---

## Persistent Storage (Optional)

If the gateway is configured to use SQLite instead of Postgres, you need a Railway Volume:

1. Go to the gateway service → **Settings** → **Volumes**
2. Click **+ New Volume**
3. Set **Mount Path** to `/app/data`
4. The `OPENWRAPPER_DB_PATH` env var is already set to `/app/data/openwrapper.sqlite3`

> For production, we recommend using Postgres (`OPENWRAPPER_DATABASE_URL`) instead of SQLite.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gateway can't connect to Postgres | Verify `OPENWRAPPER_DATABASE_URL` uses the Railway reference `${{Postgres.DATABASE_URL}}` |
| Web can't reach gateway | Check `OPENWRAPPER_GATEWAY_URL` uses `.railway.internal` hostname |
| Build fails on web | Ensure the **Root Directory** is set to `web` in Railway settings |
| `VOLUME` error in Dockerfile | Already fixed — `VOLUME` instruction was removed |
