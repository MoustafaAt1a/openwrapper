# Production Dockerfile for OpenWrapper Web Portal (Next.js)
# Build stages use Red Hat UBI 9 Node.js, production runner uses UBI 9 Node.js Minimal
FROM registry.access.redhat.com/ubi9/nodejs-22:1 AS base

USER 0
RUN npm install -g pnpm@11.0.9
USER 1001

# 1. Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# 2. Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Auth/schema code skips DB when NEXT_PHASE=phase-production-build; no secrets in ARG/ENV.
RUN pnpm run build

# 3. Production runner (Red Hat UBI 9 Minimal with Node.js 22 runtime)
FROM registry.access.redhat.com/ubi9/nodejs-22-minimal:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

USER 0
# Create dedicated high-UID unprivileged system account (10001:10001)
# hadolint ignore=DL3041
RUN microdnf install -y shadow-utils && \
    microdnf clean all && \
    groupadd --system --gid 10001 nodejs && \
    useradd --system --uid 10001 --gid nodejs -m nextjs

# Copy standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=10001:10001 /app/.next/standalone ./
COPY --from=builder --chown=10001:10001 /app/.next/static ./.next/static

USER 10001:10001

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
