#!/usr/bin/env bash
# ==============================================================================
# OpenWrapper Automated Database Backup Script (PostgreSQL & SQLite)
# ==============================================================================
set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/var/backups/openwrapper}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_COUNT=0

if [[ ! "${RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
    echo "RETENTION_DAYS must be a non-negative integer" >&2
    exit 2
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting OpenWrapper backup..."

# 1. PostgreSQL Backup if configured
if [[ -n "${OPENWRAPPER_DATABASE_URL:-}" && "${OPENWRAPPER_DATABASE_URL}" =~ ^postgres ]]; then
    PG_DUMP_FILE="${BACKUP_DIR}/openwrapper_postgres_${TIMESTAMP}.sql.gz"
    PG_DUMP_TMP="${PG_DUMP_FILE}.tmp"
    echo "Dumping PostgreSQL database to ${PG_DUMP_FILE}..."
    trap 'rm -f "${PG_DUMP_TMP:-}" "${SQLITE_DUMP_FILE:-}" "${SQLITE_GZIP_TMP:-}"' EXIT
    PGDATABASE="${OPENWRAPPER_DATABASE_URL}" pg_dump | gzip -9 > "${PG_DUMP_TMP}"
    mv "${PG_DUMP_TMP}" "${PG_DUMP_FILE}"
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    echo "✓ PostgreSQL backup created: $(du -h "${PG_DUMP_FILE}" | cut -f1)"
fi

# 2. SQLite Backup if configured
if [[ -n "${OPENWRAPPER_DB_PATH:-}" && -f "${OPENWRAPPER_DB_PATH}" ]]; then
    SQLITE_DUMP_FILE="${BACKUP_DIR}/openwrapper_sqlite_${TIMESTAMP}.sqlite3"
    echo "Vacuuming SQLite database to ${SQLITE_DUMP_FILE}..."
    sqlite3 "${OPENWRAPPER_DB_PATH}" ".backup '${SQLITE_DUMP_FILE}'"
    SQLITE_GZIP_TMP="${SQLITE_DUMP_FILE}.gz.tmp"
    gzip -9 -c "${SQLITE_DUMP_FILE}" > "${SQLITE_GZIP_TMP}"
    mv "${SQLITE_GZIP_TMP}" "${SQLITE_DUMP_FILE}.gz"
    rm -f "${SQLITE_DUMP_FILE}"
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    echo "✓ SQLite backup created: $(du -h "${SQLITE_DUMP_FILE}.gz" | cut -f1)"
fi

if (( BACKUP_COUNT == 0 )); then
    echo "No database configured; set OPENWRAPPER_DATABASE_URL or OPENWRAPPER_DB_PATH" >&2
    exit 1
fi

# 3. Clean up backups older than RETENTION_DAYS
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "openwrapper_*" -mtime +"${RETENTION_DAYS}" -delete
trap - EXIT

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."
