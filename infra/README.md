# OpenWrapper Infrastructure Directory (`infra/`)

This directory houses the complete production infrastructure, configuration, automation scripts, and observability stack for deploying OpenWrapper on **Oracle Cloud Always Free Tier** (Ampere A1 ARM64: 4 OCPUs, 24 GB RAM, 200 GB NVMe) combined with **Cloudflare Free Services** (Zero Trust Tunnel, Edge SSL/WAF, and R2 S3 Backups).

---

## Directory Structure

```
infra/
├── .env.oracle.example           # Production environment variable template
├── docker-compose.oracle.yml     # Master Docker Compose stack (12 services)
├── caddy/
│   └── Caddyfile                 # High-availability reverse proxy & load balancer
├── cloudflare/
│   └── config.yml                # Declarative Cloudflare Zero Trust ingress config
├── postgres/
│   └── postgresql.conf           # NVMe & 24 GB RAM tuned PostgreSQL 16 config
├── pgbouncer/
│   ├── Dockerfile                # PgBouncer ARM64 container definition
│   ├── entrypoint.sh             # Dynamic password and host substitution
│   └── pgbouncer.ini             # Transaction-mode connection pooler config
├── monitoring/
│   ├── prometheus.yml            # Scrape targets (Gateways, Node, cAdvisor, Caddy)
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/      # Auto-configured Prometheus datasource
│       │   └── dashboards/       # Auto-configured dashboard provider
│       └── dashboards/
│           └── openwrapper-overview.json # Production telemetry dashboard
├── scripts/
│   ├── setup-host.sh             # Host bootstrap (Docker CE, BBR, 4GB swap, sysctl)
│   ├── deploy.sh                 # Zero-downtime rolling deployment script
│   ├── backup.sh                 # Hot logical backup + SHA256 + Cloudflare R2 sync
│   ├── restore.sh                # Disaster recovery restoration & verification script
│   └── healthcheck.sh            # Instant terminal CLI health & resource diagnostics
└── systemd/
    ├── openwrapper.service       # Host boot auto-start systemd unit
    ├── openwrapper-backup.service# Daily backup invocation service
    └── openwrapper-backup.timer  # Daily 02:00 UTC backup schedule timer
```

---

## Quick Start (3 Steps)

### 1. Initialize Host (One Time)
```bash
sudo bash infra/scripts/setup-host.sh
```

### 2. Configure Environment
```bash
cp infra/.env.oracle.example infra/.env
nano infra/.env
```

### 3. Deploy Stack
```bash
bash infra/scripts/deploy.sh
```

---

## Operations Cheat Sheet

| Task | Command |
|---|---|
| **Check Stack Health** | `bash infra/scripts/healthcheck.sh` |
| **Trigger Immediate Backup** | `bash infra/scripts/backup.sh` |
| **Restore Database** | `bash infra/scripts/restore.sh` |
| **Zero-Downtime Redeploy** | `bash infra/scripts/deploy.sh` |
| **View Live Container Logs** | `docker compose -f infra/docker-compose.oracle.yml logs -f --tail=100` |
| **Restart Single Service** | `docker compose -f infra/docker-compose.oracle.yml restart <service>` |

For complete architectural details, memory budget breakdown, and Cloudflare configuration, refer to [`docs/ORACLE_CLOUDFLARE.md`](../docs/ORACLE_CLOUDFLARE.md).
