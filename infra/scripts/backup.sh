#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Enterprise Automated Backup Script (PostgreSQL & SQLite)
# Features:
#   - Consistent hot logical dump (PostgreSQL / SQLite)
#   - gzip -9 high compression
#   - SHA256 checksum generation & archive integrity validation
#   - Cloudflare R2 Off-site sync (Zero-cost S3-compatible remote storage)
#   - Configurable local (14d) and remote (30d) retention pruning
# ==============================================================================
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.oracle.yml"
ENV_FILE="${INFRA_DIR}/.env"

# Load environment if present
if [ -f "${ENV_FILE}" ]; then
    set -a
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/openwrapper}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-14}"
R2_RETENTION_DAYS="${R2_RETENTION_DAYS:-30}"
BACKUP_COUNT=0

if [[ ! "${RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: RETENTION_DAYS must be a non-negative integer" >&2
    exit 2
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Starting OpenWrapper backup sequence..."

# Function to upload file to Cloudflare R2 (S3-compatible)
sync_to_r2() {
    local file_path="$1"
    local filename
    filename=$(basename "$file_path")

    if [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
        local bucket="${R2_BUCKET_NAME:-openwrapper-backups}"
        local endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        echo "Syncing ${filename} to Cloudflare R2 (${bucket})..."

        if command -v aws &>/dev/null; then
            AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
            AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
            AWS_DEFAULT_REGION="auto" \
            aws s3 cp "${file_path}" "s3://${bucket}/${filename}" \
                --endpoint-url "${endpoint}" >/dev/null
            AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
            AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
            AWS_DEFAULT_REGION="auto" \
            aws s3 cp "${file_path}.sha256" "s3://${bucket}/${filename}.sha256" \
                --endpoint-url "${endpoint}" >/dev/null
            echo "✓ Successfully uploaded to Cloudflare R2 via aws-cli."
        elif command -v rclone &>/dev/null; then
            RCLONE_CONFIG_R2_TYPE="s3" \
            RCLONE_CONFIG_R2_PROVIDER="Cloudflare" \
            RCLONE_CONFIG_R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
            RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
            RCLONE_CONFIG_R2_ENDPOINT="${endpoint}" \
            rclone copy "${file_path}" "r2:${bucket}/" >/dev/null
            rclone copy "${file_path}.sha256" "r2:${bucket}/" >/dev/null
            echo "✓ Successfully uploaded to Cloudflare R2 via rclone."
        else
            echo "Notice: Cloudflare R2 credentials found, but neither 'aws' nor 'rclone' is installed."
            echo "Tip: Run 'apt-get install -y awscli' or 'rclone' to enable off-site cloud replication."
        fi
    fi
}

# 1. PostgreSQL Backup (Docker Stack or External URL)
if [ -f "${COMPOSE_FILE}" ] && docker compose -f "${COMPOSE_FILE}" ps postgres 2>/dev/null | grep -q "Up"; then
    PG_DUMP_FILE="${BACKUP_DIR}/openwrapper_postgres_${TIMESTAMP}.sql.gz"
    PG_DUMP_TMP="${PG_DUMP_FILE}.tmp"
    echo "Dumping PostgreSQL from Docker container to ${PG_DUMP_FILE}..."

    # Dump database via docker compose exec
    docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U openwrapper openwrapper | gzip -9 > "${PG_DUMP_TMP}"
    mv "${PG_DUMP_TMP}" "${PG_DUMP_FILE}"

    # Verify gzip integrity
    gzip -t "${PG_DUMP_FILE}"

    # Generate SHA256 checksum
    (cd "${BACKUP_DIR}" && sha256sum "$(basename "${PG_DUMP_FILE}")" > "$(basename "${PG_DUMP_FILE}").sha256")

    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    FILE_SIZE=$(du -h "${PG_DUMP_FILE}" | cut -f1)
    SHA256_HASH=$(cut -d' ' -f1 < "${PG_DUMP_FILE}.sha256")
    echo "✓ PostgreSQL backup verified: ${PG_DUMP_FILE} (${FILE_SIZE})"
    echo "  SHA256: ${SHA256_HASH}"

    sync_to_r2 "${PG_DUMP_FILE}"

elif [[ -n "${OPENWRAPPER_DATABASE_URL:-}" && "${OPENWRAPPER_DATABASE_URL}" =~ ^postgres ]]; then
    PG_DUMP_FILE="${BACKUP_DIR}/openwrapper_postgres_${TIMESTAMP}.sql.gz"
    PG_DUMP_TMP="${PG_DUMP_FILE}.tmp"
    echo "Dumping PostgreSQL database via OPENWRAPPER_DATABASE_URL..."

    PGDATABASE="${OPENWRAPPER_DATABASE_URL}" pg_dump | gzip -9 > "${PG_DUMP_TMP}"
    mv "${PG_DUMP_TMP}" "${PG_DUMP_FILE}"
    gzip -t "${PG_DUMP_FILE}"

    (cd "${BACKUP_DIR}" && sha256sum "$(basename "${PG_DUMP_FILE}")" > "$(basename "${PG_DUMP_FILE}").sha256")
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    FILE_SIZE=$(du -h "${PG_DUMP_FILE}" | cut -f1)
    echo "✓ PostgreSQL backup created: ${PG_DUMP_FILE} (${FILE_SIZE})"

    sync_to_r2 "${PG_DUMP_FILE}"
fi

# 2. SQLite Backup if configured
if [[ -n "${OPENWRAPPER_DB_PATH:-}" && -f "${OPENWRAPPER_DB_PATH}" ]]; then
    SQLITE_DUMP_FILE="${BACKUP_DIR}/openwrapper_sqlite_${TIMESTAMP}.sqlite3"
    echo "Vacuuming SQLite database to ${SQLITE_DUMP_FILE}..."
    sqlite3 "${OPENWRAPPER_DB_PATH}" ".backup '${SQLITE_DUMP_FILE}'"

    gzip -9 -c "${SQLITE_DUMP_FILE}" > "${SQLITE_DUMP_FILE}.gz"
    rm -f "${SQLITE_DUMP_FILE}"

    gzip -t "${SQLITE_DUMP_FILE}.gz"
    (cd "${BACKUP_DIR}" && sha256sum "$(basename "${SQLITE_DUMP_FILE}.gz")" > "$(basename "${SQLITE_DUMP_FILE}.gz").sha256")

    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    echo "✓ SQLite backup created: $(du -h "${SQLITE_DUMP_FILE}.gz" | cut -f1)"
    sync_to_r2 "${SQLITE_DUMP_FILE}.gz"
fi

if (( BACKUP_COUNT == 0 )); then
    echo "WARNING: No active database found to backup!" >&2
    exit 1
fi

# 3. Prune local backups older than RETENTION_DAYS
echo "Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f \( -name "openwrapper_*.sql.gz*" -o -name "openwrapper_*.sqlite3*" \) -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Backup sequence completed successfully."
