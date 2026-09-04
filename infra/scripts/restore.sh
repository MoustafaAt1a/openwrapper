#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Disaster Recovery & Restore Script
# Restores a PostgreSQL backup archive (.sql.gz) into the active database.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.oracle.yml"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/openwrapper}"

usage() {
    echo "Usage: $0 [BACKUP_FILE] [--force]"
    echo "Example: $0 /var/backups/openwrapper/openwrapper_postgres_20260904_120000.sql.gz"
    echo "If no BACKUP_FILE is specified, the most recent backup in ${BACKUP_DIR} is used."
    exit 1
}

TARGET_FILE=""
FORCE=false

for arg in "$@"; do
    if [ "$arg" == "--force" ]; then
        FORCE=true
    elif [ -z "$TARGET_FILE" ]; then
        TARGET_FILE="$arg"
    fi
done

# If no target file specified, pick the latest
if [ -z "$TARGET_FILE" ]; then
    TARGET_FILE=$(find "${BACKUP_DIR}" -type f -name "openwrapper_postgres_*.sql.gz" | sort -r | head -n 1 || true)
    if [ -z "$TARGET_FILE" ]; then
        echo "ERROR: No PostgreSQL backups found in ${BACKUP_DIR}" >&2
        exit 1
    fi
    echo "Defaulting to latest backup: ${TARGET_FILE}"
fi

if [ ! -f "$TARGET_FILE" ]; then
    echo "ERROR: File not found: ${TARGET_FILE}" >&2
    exit 1
fi

echo "======================================================================"
echo " OpenWrapper Disaster Recovery Restore Sequence"
echo " Target File: ${TARGET_FILE}"
echo " File Size:   $(du -h "${TARGET_FILE}" | cut -f1)"
echo "======================================================================"

# 1. Check SHA256 integrity if checksum file exists
SHA_FILE="${TARGET_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
    echo "Verifying SHA256 checksum..."
    EXPECTED_SHA=$(cut -d' ' -f1 < "$SHA_FILE")
    ACTUAL_SHA=$(sha256sum "$TARGET_FILE" | cut -d' ' -f1)
    if [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
        echo "ERROR: SHA256 mismatch!" >&2
        echo "  Expected: ${EXPECTED_SHA}" >&2
        echo "  Actual:   ${ACTUAL_SHA}" >&2
        exit 1
    fi
    echo "✓ SHA256 integrity verified (${ACTUAL_SHA:0:16}...)"
fi

# 2. Verify gzip integrity
echo "Verifying gzip archive structure..."
if ! gzip -t "$TARGET_FILE"; then
    echo "ERROR: Corrupted gzip archive!" >&2
    exit 1
fi
echo "✓ Archive integrity confirmed."

# 3. Confirmation prompt
if [ "$FORCE" = false ]; then
    echo ""
    echo "WARNING: Restoring this backup will OVERWRITE existing database data!"
    read -r -p "Are you sure you want to proceed with database restoration? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Restore aborted by user."
        exit 0
    fi
fi

# 4. Check docker stack
if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "ERROR: docker-compose file not found at ${COMPOSE_FILE}" >&2
    exit 1
fi

echo "Pausing traffic by scaling down gateway replicas temporarily..."
docker compose -f "${COMPOSE_FILE}" stop gateway-1 gateway-2 || true

echo "Restoring database into postgres container..."
# Decompress and feed directly into psql
gunzip -c "$TARGET_FILE" | docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U openwrapper -d openwrapper >/dev/null

echo "✓ Database schema and data restored."

# 5. Restart gateway replicas
echo "Restarting application layer..."
docker compose -f "${COMPOSE_FILE}" start gateway-1 gateway-2

# 6. Verify gateway readiness
echo "Verifying gateway status..."
sleep 3
docker compose -f "${COMPOSE_FILE}" exec -T gateway-1 curl -fsS http://127.0.0.1:8080/v1/ready >/dev/null
docker compose -f "${COMPOSE_FILE}" exec -T gateway-2 curl -fsS http://127.0.0.1:8080/v1/ready >/dev/null

echo "======================================================================"
echo "✓ Disaster recovery restore completed successfully!"
echo "======================================================================"
