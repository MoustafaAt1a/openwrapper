## 1. Quickest Path: Docker Compose

### Local Development Stack
```bash
cp .env.example .env
docker compose up --build
```
This starts the Rust Gateway (`:8080`), Next.js Web Portal (`:3000`), Postgres (`127.0.0.1:5432`), and Valkey (`127.0.0.1:6379`).

### Production Stack with Automatic SSL (Caddy)
```bash
cp .env.example .env
# Edit .env: set DOMAIN=your-domain.example, POSTGRES_PASSWORD, and OPENWRAPPER_API_KEYS
docker compose -f docker-compose.prod.yml up -d --build
```
This deploys Caddy as a public entrypoint on ports `80` and `443` with automated Let's Encrypt certificates, reverse-proxying `/v1/*` to the Rust Gateway and all portal routes to Next.js.

---

## 2. Production Reverse Proxies

The gateway itself speaks plain HTTP and intentionally delegates TLS termination to reverse proxies (see `docs/SECURITY.md`).

### Option A: Caddy (`infra/caddy/Caddyfile`)
Caddy automatically provisions and renews SSL certificates:
```caddy
{$DOMAIN:localhost} {
    encode zstd gzip
    
    # Route Rust Gateway API & Webhooks
    handle /v1/* {
        reverse_proxy http://gateway:8080
    }
    
    # Route Next.js Web Dashboard
    handle {
        reverse_proxy http://web:3000
    }
}
```

### Option B: Nginx (`infra/nginx/nginx.conf`)
High-performance Nginx reverse proxy with HTTP/2 and security headers:
```bash
cp infra/nginx/nginx.conf /etc/nginx/nginx.conf
nginx -t && systemctl reload nginx
```

---

## 3. Bare-Metal & VM Hosting (Systemd)

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
   cp web/.env /etc/openwrapper/web.env
   chmod 600 /etc/openwrapper/web.env
   systemctl daemon-reload
   systemctl enable --now openwrapper-web
   ```

---

## 4. Kubernetes Deployment (`infra/k8s/deployment.yaml`)

Deploy to any Kubernetes 1.25+ cluster:
```bash
kubectl apply -f infra/k8s/deployment.yaml
```
Includes:
- Namespace isolation (`openwrapper`)
- Automated Liveness (`/v1/health`) and Readiness (`/v1/ready`) probes
- Resource requests and limits
- Zero-downtime rolling updates

---

## 5. Automated Database Backups (`infra/scripts/backup.sh`)

Automate daily PostgreSQL or SQLite snapshots with compression and retention pruning:
```bash
# Add to crontab: 0 2 * * * /var/www/openwrapper/infra/scripts/backup.sh >> /var/log/openwrapper_backup.log 2>&1
chmod +x infra/scripts/backup.sh
./infra/scripts/backup.sh
```

---

## 6. Go-Live Checklist

- [ ] `OPENWRAPPER_API_KEYS` set to a real, randomly generated value (`openssl rand -hex 32`), not left as default.
- [ ] `BETTER_AUTH_SECRET` set to a random 32+ character string.
- [ ] TLS terminated in front of the gateway (Caddy, Nginx, or cloud load balancer).
- [ ] `PAYMOB_NOTIFICATION_URL` / Fawry webhook configuration points at the public HTTPS URL (`https://your-domain.example/v1/webhooks/paymob`).
- [ ] Tested against Paymob/Fawry sandbox accounts before switching to live credentials.
- [ ] If running multiple gateway replicas: `OPENWRAPPER_DATABASE_URL` set to PostgreSQL and `OPENWRAPPER_CACHE_URL` set to Valkey/Redis for shared rate limiting.
- [ ] SQLite users only: `OPENWRAPPER_DB_PATH` is placed on a persistent volume.
- [ ] PostgreSQL backups scheduled and verified with `ops/scripts/backup.sh`.
- [ ] Structured JSON logging enabled (`OPENWRAPPER_LOG_FORMAT=json`) and forwarded to your log aggregator.

