#!/bin/sh
set -e

# Generate userlist.txt from environment variables
echo "\"${PGUSER:-postgres}\" \"${PGPASSWORD}\"" > /etc/pgbouncer/userlist.txt

# Substitute environment variables in pgbouncer.ini
envsubst < /etc/pgbouncer/pgbouncer.ini.template > /etc/pgbouncer/pgbouncer.ini

echo "[PgBouncer] Starting connection pooler..."
echo "[PgBouncer] Pool mode: transaction"
echo "[PgBouncer] Upstream: ${PGHOST:-postgres.railway.internal}:${PGPORT:-5432}/${PGDATABASE:-railway}"

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
