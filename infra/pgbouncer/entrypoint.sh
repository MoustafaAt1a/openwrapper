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

# Create directory if missing
mkdir -p /etc/pgbouncer

# Keep the generated credential file private (0600)
umask 077
printf '"%s" "%s"\n' "${PGUSER}" "${PGPASSWORD}" > /etc/pgbouncer/userlist.txt
chmod 600 /etc/pgbouncer/userlist.txt

# Perform template substitution using standard POSIX sed (avoids missing envsubst / gettext dependency)
sed \
    -e "s|\${PGHOST}|${PGHOST}|g" \
    -e "s|\${PGPORT}|${PGPORT}|g" \
    -e "s|\${PGDATABASE}|${PGDATABASE}|g" \
    /etc/pgbouncer/pgbouncer.ini.template > /etc/pgbouncer/pgbouncer.ini

echo "[PgBouncer] Initialized with pool mode: transaction"
echo "[PgBouncer] Upstream: ${PGHOST}:${PGPORT}/${PGDATABASE}"

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
