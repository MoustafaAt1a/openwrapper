FROM edoburu/pgbouncer:1.25.2-p0

RUN mkdir -p /etc/pgbouncer && chown -R 70:70 /etc/pgbouncer

COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown 70:70 /entrypoint.sh

USER 70:70

EXPOSE 6432

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD ["pg_isready", "-h", "127.0.0.1", "-p", "6432"]

ENTRYPOINT ["/entrypoint.sh"]
