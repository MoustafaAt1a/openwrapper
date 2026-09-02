#!/bin/sh
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"

case "${PGUSER}${PGPASSWORD}" in
  *'"'*|*'
'*)
    echo "PGUSER and PGPASSWORD must not contain quotes or newlines" >&2
    exit 2
    ;;
esac

# Keep the generated credential file private and avoid echo's option and
# escape-sequence ambiguities.
umask 077
printf '"%s" "%s"\n' "${PGUSER}" "${PGPASSWORD}" > /etc/pgbouncer/userlist.txt

# Only substitute the non-secret settings used by the template.
envsubst '${PGHOST} ${PGPORT} ${PGDATABASE}' \
    < /etc/pgbouncer/pgbouncer.ini.template \
    > /etc/pgbouncer/pgbouncer.ini

echo "[PgBouncer] Starting connection pooler..."
echo "[PgBouncer] Pool mode: transaction"
echo "[PgBouncer] Upstream: ${PGHOST}:${PGPORT}/${PGDATABASE}"

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
