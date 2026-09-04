# OpenWrapper Infrastructure Directory (`infra/`)

This directory houses the complete production infrastructure, configuration, automation scripts, and observability stack for deploying OpenWrapper on **Oracle Cloud Always Free Tier** (Ampere A1 ARM64: 4 OCPUs, 24 GB RAM, 200 GB NVMe) combined with **Cloudflare Free Services** (Zero Trust Tunnel, Edge SSL/WAF, and R2 S3 Backups), as well as cloud-native **Kubernetes / K3s** manifests.

---

## Directory Structure

```
infra/
├── .env.oracle.example           # Production environment variable template
├── docker-compose.oracle.yml     # Master Docker Compose stack (12 services)
├── caddy/
│   └── Caddyfile                 # High-availability reverse proxy, HTTP router & gRPC :50051 load balancer
├── cloudflare/
│   └── config.yml                # Declarative Cloudflare Zero Trust ingress config
├── k8s/
│   ├── README.md                 # Kubernetes & K3s deployment & comparison guide
│   ├── backend.yaml              # PostgreSQL StatefulSet, PgBouncer, Valkey, RabbitMQ, Cloudflared
│   └── deployment.yaml           # Gateway (2 replicas), Web (2 replicas), PDBs & probes
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

## Deployment Options

### Option A: Docker Compose (Recommended for Single Oracle VPS)
- **Zero control-plane overhead**: Consumes only ~35 MB RAM, maximizing memory for PostgreSQL shared buffers.
- **Maximum I/O**: Direct host NVMe bind mounts without CSI storage driver layers.
- **Native networking**: Zero overlay encapsulation latency.

```bash
# 1. Initialize Host (One Time)
sudo bash infra/scripts/setup-host.sh

# 2. Configure Environment
cp infra/.env.oracle.example infra/.env
nano infra/.env

# 3. Deploy Stack
bash infra/scripts/deploy.sh
```

### Option B: Kubernetes / K3s (For Multi-Node Clusters & GitOps)
- Complete declarative manifests for PostgreSQL StatefulSet, PgBouncer, Valkey, RabbitMQ, Gateway replicas, and Web dashboard.
- Full guide and secret provisioning steps in [`infra/k8s/README.md`](k8s/README.md).

```bash
# 1. Create Namespace & apply manifests
kubectl create namespace openwrapper
kubectl apply -f infra/k8s/backend.yaml
kubectl apply -f infra/k8s/deployment.yaml

# 2. Verify Pods
kubectl get pods -n openwrapper
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
