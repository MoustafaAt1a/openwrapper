#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Zero-Downtime Deployment Script (Oracle Cloud Always Free Tier)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${INFRA_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.oracle.yml"
ENV_FILE="${INFRA_DIR}/.env"

echo "======================================================================"
echo " Starting OpenWrapper Zero-Downtime Deployment"
echo " Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================================"

# 1. Check environment file
if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${ROOT_DIR}/.env" ]; then
        echo "Linking ${ROOT_DIR}/.env -> ${ENV_FILE}"
        ln -sf "${ROOT_DIR}/.env" "${ENV_FILE}"
    else
        echo "ERROR: Environment file not found!" >&2
        echo "Please create ${ENV_FILE} from ${INFRA_DIR}/.env.oracle.example" >&2
        exit 1
    fi
fi

# 2. Source and validate critical environment variables
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

MISSING_VARS=()
[ -z "${POSTGRES_PASSWORD:-}" ] && MISSING_VARS+=("POSTGRES_PASSWORD")
[ -z "${BETTER_AUTH_SECRET:-}" ] && MISSING_VARS+=("BETTER_AUTH_SECRET")
[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ] && MISSING_VARS+=("CLOUDFLARE_TUNNEL_TOKEN")
[ -z "${CLOUDFLARE_DOMAIN:-}" ] && MISSING_VARS+=("CLOUDFLARE_DOMAIN")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "ERROR: Missing required environment variables in ${ENV_FILE}:" >&2
    for v in "${MISSING_VARS[@]}"; do
        echo "  - $v" >&2
    done
    exit 1
fi

echo "✓ Environment validation passed."

# 3. Build container images
echo "Building container images for ARM64..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build gateway-1 gateway-2 web pgbouncer

# 4. Bring up core storage & messaging tiers first
echo "Ensuring database, cache, and message bus are online..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d postgres pgbouncer valkey rabbitmq

# 5. Wait for PgBouncer & Postgres to be healthy
echo "Waiting for database connection pooler to become healthy..."
TIMEOUT=60
ELAPSED=0
until docker compose -f "${COMPOSE_FILE}" exec -T pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U openwrapper -d openwrapper >/dev/null 2>&1; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "ERROR: PgBouncer failed to become healthy within ${TIMEOUT}s" >&2
        exit 1
    fi
done
echo "✓ Database & PgBouncer are ready."

# 6. Rolling deployment of Gateway Replicas (Zero Downtime)
echo "Deploying gateway-1..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --no-deps gateway-1
echo "Verifying gateway-1 health..."
docker compose -f "${COMPOSE_FILE}" exec -T gateway-1 curl -fsS http://127.0.0.1:8080/v1/ready >/dev/null
echo "✓ gateway-1 is healthy and serving."

echo "Deploying gateway-2..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --no-deps gateway-2
echo "Verifying gateway-2 health..."
docker compose -f "${COMPOSE_FILE}" exec -T gateway-2 curl -fsS http://127.0.0.1:8080/v1/ready >/dev/null
echo "✓ gateway-2 is healthy and serving."

# 7. Deploy Web Dashboard, Ingress, and Observability
echo "Deploying web portal, ingress, and monitoring stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d web caddy cloudflared prometheus grafana node-exporter cadvisor

# 8. Verification & Summary
echo "======================================================================"
echo " Deployment Summary"
echo "======================================================================"
docker compose -f "${COMPOSE_FILE}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Public Endpoints (via Cloudflare Edge):"
echo "  - Web Dashboard:    https://${WEB_DOMAIN:-openwrapper.muejam.com}"
echo "  - Gateway Ingress:  https://${GATEWAY_DOMAIN:-gateway.openwrapper.muejam.com}/v1/health"
echo "  - Grafana Telemetry: https://${GRAFANA_DOMAIN:-grafana.openwrapper.muejam.com}"
echo ""
echo "✓ Deployment completed successfully without downtime."
