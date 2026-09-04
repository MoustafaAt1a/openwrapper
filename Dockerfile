# syntax=docker/dockerfile:1

# Multi-stage build: compile with the workspace's declared MSRV, then copy
# only the gateway binary into a minimal runtime image.
FROM rust:1.88-bookworm AS builder

WORKDIR /build

# Copy manifests first so dependency compilation is cached across builds
# that only change application source.
COPY Cargo.toml Cargo.lock ./
COPY crates/core/Cargo.toml crates/core/Cargo.toml
COPY crates/providers/paymob/Cargo.toml crates/providers/paymob/Cargo.toml
COPY crates/providers/fawry/Cargo.toml crates/providers/fawry/Cargo.toml
COPY apps/gateway/Cargo.toml apps/gateway/Cargo.toml
COPY tests/architecture/Cargo.toml tests/architecture/Cargo.toml

# Install protobuf-compiler for tonic/prost gRPC compilation
RUN apt-get update \
    && apt-get install -y --no-install-recommends protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Now the real sources.
COPY crates crates
COPY apps/gateway apps/gateway
COPY tests tests
COPY proto proto

RUN cargo build --locked --release -p openwrapper-gateway

# ---

FROM debian:bookworm-slim AS runtime

# ca-certificates: required for TLS to Paymob/Fawry/Postgres/Valkey.
# curl: used only by the health check below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 10001 openwrapper \
    && useradd --system --uid 10001 --gid openwrapper --create-home \
        --home-dir /app --shell /usr/sbin/nologin openwrapper
WORKDIR /app
COPY --from=builder /build/target/release/openwrapper-gateway /usr/local/bin/openwrapper-gateway
USER 10001:10001

# For SQLite persistence, mount a volume at /app/data. Production stacks
# override this with OPENWRAPPER_DATABASE_URL pointing to PostgreSQL.
ENV OPENWRAPPER_DATABASE_URL=/app/data/openwrapper.sqlite3
ENV OPENWRAPPER_BIND_ADDR=0.0.0.0:8080
ENV OPENWRAPPER_GRPC_BIND_ADDR=0.0.0.0:50051

EXPOSE 8080 50051

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8080/v1/ready || exit 1

ENTRYPOINT ["openwrapper-gateway"]
