# syntax=docker/dockerfile:1

# Multi-stage build: a full Rust toolchain to compile, a minimal runtime
# image to actually ship. This project's Cargo.toml pins several
# dependency versions below their latest releases (see docs/DECISIONS.md
# D9) purely as a workaround for the old Rust toolchain available in the
# sandbox this project was originally built in — those pins are harmless
# here (a newer rustc happily compiles older, valid crate versions), so
# this Dockerfile uses a current, unpinned Rust image rather than
# reproducing that constraint.
FROM rust:1-bookworm AS builder

WORKDIR /build

# Copy manifests first so dependency compilation is cached across builds
# that only change application source.
COPY Cargo.toml Cargo.lock ./
COPY core/Cargo.toml core/Cargo.toml
COPY providers/paymob/Cargo.toml providers/paymob/Cargo.toml
COPY providers/fawry/Cargo.toml providers/fawry/Cargo.toml
COPY gateway/Cargo.toml gateway/Cargo.toml
COPY tests/architecture/Cargo.toml tests/architecture/Cargo.toml

# Now the real sources.
COPY core core
COPY providers providers
COPY gateway gateway
COPY tests tests

RUN cargo build --release -p openwrapper-gateway

# ---

FROM debian:bookworm-slim AS runtime

# ca-certificates: required for TLS to Paymob/Fawry/Postgres/Valkey.
# curl: used only by the HEALTHCHECK below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --home-dir /app --shell /usr/sbin/nologin openwrapper
WORKDIR /app
COPY --from=builder /build/target/release/openwrapper-gateway /usr/local/bin/openwrapper-gateway
USER openwrapper

# Not a substitute for OPENWRAPPER_DB_PATH being on a persistent volume —
# see docker-compose.yml and docs/DEPLOYMENT.md.
VOLUME ["/app/data"]
ENV OPENWRAPPER_DB_PATH=/app/data/openwrapper.sqlite3
ENV OPENWRAPPER_BIND_ADDR=0.0.0.0:8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:8080/v1/health || exit 1

ENTRYPOINT ["openwrapper-gateway"]
