#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Instant Infrastructure Health Diagnostics
# Runs deep health probes across all 12 containers, resources, and endpoints.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.oracle.yml"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================================================"
echo -e "${BLUE} OpenWrapper Production Health Diagnostics (Oracle Cloud HA Stack)${NC}"
echo " Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================================"

# 1. Host Resources
echo -e "\n${BLUE}[1. Host Resources & Headroom]${NC}"
if [ -f /proc/loadavg ]; then
    LOAD=$(cut -d' ' -f1-3 /proc/loadavg)
    echo "  - CPU Load Average: ${LOAD} (4 OCPUs available)"
fi

if command -v free &>/dev/null; then
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
    USED_MEM=$(free -h | awk '/^Mem:/ {print $3}')
    AVAIL_MEM=$(free -h | awk '/^Mem:/ {print $7}')
    echo "  - RAM: ${USED_MEM} used / ${AVAIL_MEM} available (out of ${TOTAL_MEM})"
fi

if command -v df &>/dev/null; then
    DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
    DISK_PCT=$(df -h / | awk 'NR==2 {print $5}')
    echo "  - NVMe Disk: ${DISK_AVAIL} available (${DISK_PCT} used)"
fi

# 2. Container Status
echo -e "\n${BLUE}[2. Container Process States]${NC}"
if [ -f "${COMPOSE_FILE}" ]; then
    docker compose -f "${COMPOSE_FILE}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"
else
    echo "  Compose file not found at ${COMPOSE_FILE}"
fi

# 3. Live Functional Health Probes
echo -e "\n${BLUE}[3. Live Functional Health Probes]${NC}"

probe_service() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        echo -e "  [${GREEN}ONLINE${NC}]   ${name}"
    else
        echo -e "  [${RED}OFFLINE${NC}]  ${name}"
    fi
}

probe_service "PostgreSQL (port 5432)" \
    "docker compose -f ${COMPOSE_FILE} exec -T postgres pg_isready -U openwrapper"

probe_service "PgBouncer Pooler (port 6432)" \
    "docker compose -f ${COMPOSE_FILE} exec -T pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U openwrapper -d openwrapper"

probe_service "Valkey 8 Cache (Redis protocol)" \
    "docker compose -f ${COMPOSE_FILE} exec -T valkey valkey-cli ping"

probe_service "RabbitMQ 3.13 Message Bus" \
    "docker compose -f ${COMPOSE_FILE} exec -T rabbitmq rabbitmq-diagnostics -q ping"

probe_service "Gateway Replica 1 (/v1/ready)" \
    "docker compose -f ${COMPOSE_FILE} exec -T gateway-1 curl -fsS http://127.0.0.1:8080/v1/ready"

probe_service "Gateway Replica 2 (/v1/ready)" \
    "docker compose -f ${COMPOSE_FILE} exec -T gateway-2 curl -fsS http://127.0.0.1:8080/v1/ready"

probe_service "Next.js Web Portal (/api/v1/health)" \
    "docker compose -f ${COMPOSE_FILE} exec -T web node -e \"fetch('http://127.0.0.1:3000/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\""

probe_service "Caddy Reverse Proxy (/metrics)" \
    "docker compose -f ${COMPOSE_FILE} exec -T caddy wget -qO- http://127.0.0.1:2019/metrics"

probe_service "Prometheus Telemetry Engine" \
    "docker compose -f ${COMPOSE_FILE} exec -T prometheus wget -qO- http://127.0.0.1:9090/-/healthy"

probe_service "Grafana Telemetry Dashboard" \
    "docker compose -f ${COMPOSE_FILE} exec -T grafana wget -qO- http://127.0.0.1:3000/api/health"

# 4. Backup State
echo -e "\n${BLUE}[4. Backup Freshness]${NC}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openwrapper}"
if [ -d "${BACKUP_DIR}" ]; then
    LATEST_BACKUP=$(find "${BACKUP_DIR}" -type f -name "openwrapper_postgres_*.sql.gz" | sort -r | head -n 1 || true)
    if [ -n "${LATEST_BACKUP}" ]; then
        BACKUP_TIME=$(stat -c %y "${LATEST_BACKUP}" 2>/dev/null || stat -f "%Sm" "${LATEST_BACKUP}" 2>/dev/null || echo "unknown")
        BACKUP_SIZE=$(du -h "${LATEST_BACKUP}" | cut -f1)
        echo -e "  Latest Backup: ${GREEN}$(basename "${LATEST_BACKUP}")${NC} (${BACKUP_SIZE})"
        echo "  Created At:    ${BACKUP_TIME}"
    else
        echo -e "  ${YELLOW}No backups found yet in ${BACKUP_DIR}${NC}"
    fi
else
    echo -e "  ${YELLOW}Backup directory does not exist yet${NC}"
fi

echo -e "\n======================================================================"
echo " Health diagnostics complete."
echo "======================================================================"
