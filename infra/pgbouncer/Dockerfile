FROM edoburu/pgbouncer:1.23.1-p2

COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 6432

ENTRYPOINT ["/entrypoint.sh"]
