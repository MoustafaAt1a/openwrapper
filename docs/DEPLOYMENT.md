## 1. Quickest Path: Docker Compose

### Local Development Stack
```bash
cp .env.example .env
docker compose up --build
```
This starts:

| Service | Port | Role |
|---|---|---|
| **gateway** | `:8080` | Rust payment gateway engine |
| **web** | `:3000` | Next.js dashboard & developer portal |
| **postgres** | `127.0.0.1:5432` | Primary database (loopback only) |
| **pgbouncer** | `127.0.0.1:6432` | Transaction-mode connection pooler in front of Postgres |
| **rabbitmq** | `127.0.0.1:5672` / `:15672` | Optional async webhook/reconciliation bus (management UI on 15672) |
| **valkey** | `127.0.0.1:6379` | Distributed rate-limit cache |

Gateway and web connect to Postgres **through PgBouncer** (`pgbouncer:6432`),
not directly to the `postgres` service. RabbitMQ is wired by default in
`docker-compose.yml` but remains optional at the application level — unset
`OPENWRAPPER_AMQP_URL` to use in-process webhook and reconciliation
handlers instead.

### Production Stack with Automatic SSL (Caddy)
```bash
cp .env.example .env
# Set DOMAIN, ACME_EMAIL, BETTER_AUTH_URL, BETTER_AUTH_SECRET,
# POSTGRES_PASSWORD, RABBITMQ_PASSWORD, and OPENWRAPPER_API_KEYS.
docker compose -f docker-compose.prod.yml up -d --build
```
This deploys Caddy as a public entrypoint on ports `80` and `443` with automated Let's Encrypt certificates, reverse-proxying `/v1/*` to the Rust Gateway and all portal routes to Next.js.

---

## 2. Production Reverse Proxies

The gateway itself speaks plain HTTP and intentionally delegates TLS termination to reverse proxies (see `docs/SECURITY.md`).

### Option A: Caddy (`infra/caddy/Caddyfile`)
Caddy automatically provisions and renews SSL certificates:
```caddy
{$DOMAIN} {
    encode zstd gzip
    
    # Route Rust Gateway API & Webhooks
    handle /v1/* {
        reverse_proxy http://gateway:8080
    }
    
    # Route Next.js Web Dashboard
    handle {
        reverse_proxy http://web:3000
    }

    log {
        output stdout
        format filter {
            request>headers delete
        }
    }
}
```

The checked-in Caddyfile drops all request headers from access logs so
`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`, cookies, and authorization values
cannot be emitted. Preserve that filter if you customize logging.

### Option B: Nginx

Use your own Nginx configuration. There is no checked-in
`infra/nginx/nginx.conf` in this repository — the Caddyfile above is the
maintained reference. If you prefer Nginx, mirror the same routing rules:
`/v1/*` → gateway `:8080`, everything else → web `:3000`, with TLS
terminated at the edge and credential headers redacted from access logs.

---

## 3. Database connection pooling (PgBouncer)

Production deployments should place **PgBouncer** between application
processes and PostgreSQL:

```
Postgres  ←  PgBouncer (transaction mode, :6432)  ←  gateway + web
```

- **Image / config**: `infra/pgbouncer/` (`edoburu/pgbouncer` base,
  transaction `pool_mode`, `max_client_conn = 200`).
- **Gateway URL**: point `OPENWRAPPER_DATABASE_URL` at PgBouncer
  (`postgres://user:pass@pgbouncer:6432/dbname`). The gateway auto-appends
  `statement_cache_mode=describe` when the host contains `pgbouncer` or
  port `6432` — required because transaction-mode pooling does not support
  prepared statement caching.
- **Web URL**: set `DATABASE_POOLER_URL` (preferred) or `DATABASE_URL` to
  the same PgBouncer endpoint. The web pool sets `prepareThreshold: 0` for
  the same reason — see `docs/OPERATIONS.md`.

Direct Postgres connections (`:5432`) remain valid for migrations and
admin tooling; application traffic should use the pooler.

---

## 4. Optional message bus (RabbitMQ)

RabbitMQ decouples webhook ingestion and reconciliation work from the HTTP
request path when `OPENWRAPPER_AMQP_URL` is set. Without it, the gateway
processes webhooks and reconciliation in-process — a supported and simpler
configuration for single-instance deployments.

Docker Compose includes a `rabbitmq` service with a dedicated vhost. See
`docs/OPERATIONS.md` for `OPENWRAPPER_AMQP_*` variables and
`docs/DECISIONS.md` D18 for the architectural rationale.

---

## 5. Bare-Metal & VM Hosting (Systemd)

Hardened systemd unit files with Linux kernel sandboxing (`ProtectSystem=strict`, `NoNewPrivileges=true`, `PrivateTmp=true`):

1. **Gateway Service** (`infra/systemd/openwrapper-gateway.service`):
   ```bash
   cp infra/systemd/openwrapper-gateway.service /etc/systemd/system/
   cp .env.example /etc/openwrapper/gateway.env
   chmod 600 /etc/openwrapper/gateway.env
   systemctl daemon-reload
   systemctl enable --now openwrapper-gateway
   ```

2. **Web Portal Service** (`infra/systemd/openwrapper-web.service`):
   ```bash
   cp infra/systemd/openwrapper-web.service /etc/systemd/system/
   cp .env.example /etc/openwrapper/web.env
   # Remove gateway-only values and set the web variables for this host.
   chmod 600 /etc/openwrapper/web.env
   systemctl daemon-reload
   systemctl enable --now openwrapper-web
   ```

Point both services at PgBouncer, not raw Postgres, in production.

---

## 6. Kubernetes Deployment (`infra/k8s/deployment.yaml`)

Before applying `infra/k8s/deployment.yaml`:

1. Publish the gateway and web images and replace the example `image:`
   references with immutable digests from your registry.
2. Create `openwrapper-gateway-secrets` with at least
   `OPENWRAPPER_DATABASE_URL` and `OPENWRAPPER_API_KEYS`, plus cache, AMQP,
   and enabled-provider values as needed.
3. Create `openwrapper-web-secrets` with `DATABASE_URL`,
   `DATABASE_POOLER_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
   `OPENWRAPPER_GATEWAY_URL`, plus Stripe values if enabled. Use an external
   secret manager or encrypted deployment pipeline; do not commit Secret
   objects containing real values.

Then apply the manifest:

```bash
kubectl apply -f infra/k8s/deployment.yaml
```

It includes restricted pod security, separate gateway/web configuration,
startup/liveness/readiness probes, resource bounds, topology spreading,
rolling-update controls, and disruption budgets. The web health endpoint
currently proves HTTP liveness only; do not treat it as dependency readiness.

---

## 7. Automated Database Backups (`infra/scripts/backup.sh`)

Automate daily PostgreSQL or SQLite snapshots with private permissions,
atomic output, compression, and retention pruning. The script fails when no
supported database is configured:
```bash
# Add to crontab: 0 2 * * * /var/www/openwrapper/infra/scripts/backup.sh >> /var/log/openwrapper_backup.log 2>&1
chmod +x infra/scripts/backup.sh
./infra/scripts/backup.sh
```

---

## 8. Client SDKs

After deployment, integrate from your application using one of the official clients:

| SDK | Path | Install |
|---|---|---|
| TypeScript | `sdk/typescript/` | `npm install @openwrapper/sdk` |
| PHP | `sdk/php/` | Composer `openwrapper/sdk` |
| .NET 8 | `sdk/dotnet/` | `dotnet add reference sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj` |

**.NET quick start** (web proxy on Railway or local Next.js):

```csharp
using OpenWrapper;
using OpenWrapper.Models;

var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = "https://your-app.up.railway.app/api/v1",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
});

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 10000,
    Currency = "EGP",
    Customer = new CustomerDetails { Phone = "+201234567890" },
});
```

Point `BaseUrl` at the Rust gateway (`https://gateway.example.com`) when calling the gateway directly, or at the web API root (`/api/v1`) when using the Next.js proxy. See `sdk/dotnet/README.md` for stateless provider credential headers and DI patterns.

---

## 9. Go-Live Checklist

- [ ] `OPENWRAPPER_API_KEYS` set to a real, randomly generated value (`openssl rand -hex 32`), not left as default.
- [ ] `BETTER_AUTH_SECRET` set to a random 32+ character string.
- [ ] TLS terminated in front of the gateway (Caddy, Nginx, or cloud load balancer).
- [ ] `PAYMOB_NOTIFICATION_URL` / Fawry webhook configuration points at the public HTTPS URL (`https://your-domain.example/v1/webhooks/paymob`).
- [ ] Tested against Paymob/Fawry sandbox accounts before switching to live credentials.
- [ ] If running multiple gateway replicas: `OPENWRAPPER_DATABASE_URL` set to PostgreSQL (via PgBouncer) and `OPENWRAPPER_CACHE_URL` set to Valkey/Redis for shared rate limiting.
- [ ] Application database URLs point at **PgBouncer** (`:6432`), not raw Postgres, with `prepareThreshold: 0` / `statement_cache_mode=describe` as documented.
- [ ] Reverse-proxy and APM access logs redact `X-Paymob-*`, `X-Fawry-*`, and `X-Stripe-*` headers (`docs/SECURITY.md`).
- [ ] (Optional) `OPENWRAPPER_AMQP_URL` set if you want async webhook/reconciliation processing via RabbitMQ.
- [ ] SQLite users only: `OPENWRAPPER_DATABASE_URL` points to a file on a persistent volume (for example `/app/data/openwrapper.sqlite3`).
- [ ] PostgreSQL backups scheduled and verified with `infra/scripts/backup.sh`.
- [ ] Structured JSON logging enabled (`OPENWRAPPER_LOG_FORMAT=json`) and forwarded to your log aggregator.
