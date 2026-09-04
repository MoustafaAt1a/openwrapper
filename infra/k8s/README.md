# OpenWrapper Kubernetes & K3s Manifests (`infra/k8s/`)

This directory contains production Kubernetes / K3s manifests for deploying the OpenWrapper stack onto a Kubernetes cluster.

---

## Docker Compose vs K3s vs Full K8s Comparison

| Dimension | Docker Compose (Recommended for 1 VPS) | K3s (Lightweight K8s) | Full K8s (kubeadm / EKS / GKE) |
|---|---|---|---|
| **Best Suited For** | Single Oracle Always Free VPS (Ampere A1) | Multi-node VPS clusters / GitOps workflows | Enterprise multi-region cloud clusters |
| **Control Plane Overhead** | **~35 MB RAM** (Docker daemon) | **~600 - 800 MB RAM** | **~2.5 - 4.0 GB RAM** |
| **Idle CPU Utilization** | **0% CPU** | ~3 - 7% CPU | ~10 - 20% CPU |
| **Network Latency** | Direct Linux bridge (lowest possible) | Flannel VXLAN overlay | CNI overlay (Calico / Cilium) |
| **Storage Performance** | Direct NVMe host bind mounts | Local-path CSI storage class | Cloud CSI driver (EBS, OCI Block) |
| **Operational Simplicity** | 1 Compose file + Systemd auto-heal | `kubectl`, CRDs, ingress controllers | Full Kubernetes administration |
| **Stateless HA** | 2 Replicas + Caddy Healthcheck LB | 2 Replicas + ClusterIP Service | 2+ Replicas + HorizontalPodAutoscaler |

### Architectural Recommendation:
1. **For the Oracle Cloud Always Free 1-Instance Setup**:
   Use **Docker Compose** (`infra/docker-compose.oracle.yml`). It gives you maximum raw NVMe I/O, zero network overlay overhead, saves ~800MB RAM for PostgreSQL cache, and has zero control-plane failure modes.
2. **If you expand to 2+ Oracle VPS instances or already use Kubernetes tooling**:
   Use **K3s** with the manifests in this directory (`infra/k8s/`).

---

## Deploying to K3s / Kubernetes

### 1. Install K3s (if not already installed)
```bash
curl -sfL https://get.k3s.io | sh -s - --disable traefik
```

### 2. Create Namespace and Secrets
```bash
kubectl create namespace openwrapper

kubectl create secret generic openwrapper-secrets -n openwrapper \
  --from-literal=POSTGRES_PASSWORD="your_strong_postgres_password" \
  --from-literal=RABBITMQ_PASSWORD="your_strong_rabbitmq_password" \
  --from-literal=CLOUDFLARE_TUNNEL_TOKEN="your_cloudflare_tunnel_token"

kubectl create secret generic openwrapper-gateway-secrets -n openwrapper \
  --from-literal=OPENWRAPPER_API_KEYS="ow_live_your_api_key" \
  --from-literal=OPENWRAPPER_DATABASE_URL="postgres://openwrapper:your_strong_postgres_password@pgbouncer:6432/openwrapper" \
  --from-literal=OPENWRAPPER_CACHE_URL="redis://valkey:6379" \
  --from-literal=OPENWRAPPER_AMQP_URL="amqp://openwrapper:your_strong_rabbitmq_password@rabbitmq:5672/openwrapper"

kubectl create secret generic openwrapper-web-secrets -n openwrapper \
  --from-literal=DATABASE_URL="postgres://openwrapper:your_strong_postgres_password@pgbouncer:6432/openwrapper" \
  --from-literal=BETTER_AUTH_SECRET="your_32_char_better_auth_secret"
```

### 3. Apply Backend & Application Manifests
```bash
kubectl apply -f infra/k8s/backend.yaml
kubectl apply -f infra/k8s/deployment.yaml
```

### 4. Verify Pod Health
```bash
kubectl get pods -n openwrapper
```
