#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Automated Database Backup Script (PostgreSQL & SQLite)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/openwrapper}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting OpenWrapper backup..."

# 1. PostgreSQL Backup if configured
if [[ -n "${OPENWRAPPER_DATABASE_URL:-}" && "${OPENWRAPPER_DATABASE_URL}" =~ ^postgres ]]; then
    PG_DUMP_FILE="${BACKUP_DIR}/openwrapper_postgres_${TIMESTAMP}.sql.gz"
    echo "Dumping PostgreSQL database to ${PG_DUMP_FILE}..."
    pg_dump "${OPENWRAPPER_DATABASE_URL}" | gzip -9 > "${PG_DUMP_FILE}"
    echo "✓ PostgreSQL backup created: $(du -h "${PG_DUMP_FILE}" | cut -f1)"
fi

# 2. SQLite Backup if configured
if [[ -n "${OPENWRAPPER_DB_PATH:-}" && -f "${OPENWRAPPER_DB_PATH}" ]]; then
    SQLITE_DUMP_FILE="${BACKUP_DIR}/openwrapper_sqlite_${TIMESTAMP}.sqlite3"
    echo "Vacuuming SQLite database to ${SQLITE_DUMP_FILE}..."
    sqlite3 "${OPENWRAPPER_DB_PATH}" ".vacuum '${SQLITE_DUMP_FILE}'"
    gzip -9 "${SQLITE_DUMP_FILE}"
    echo "✓ SQLite backup created: $(du -h "${SQLITE_DUMP_FILE}.gz" | cut -f1)"
fi

# 3. Clean up backups older than RETENTION_DAYS
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "openwrapper_*" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."
