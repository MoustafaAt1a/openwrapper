# Production Dockerfile for OpenWrapper Web Portal (Next.js)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# 1. Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 2. Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build-time placeholders — Railway injects real values at runtime only.
ARG BETTER_AUTH_SECRET=build-time-placeholder-auth-secret-not-used-at-runtime
ARG DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm build

# 3. Production runner (standalone output)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
EXPOSE 8080

CMD ["node", "server.js"]
