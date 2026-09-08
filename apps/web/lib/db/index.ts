import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, types } from "pg"
import { isNextProductionBuild } from "@/lib/next-build"
import * as schema from "./schema"

// Parse 64-bit integers (BIGINT/BIGSERIAL) as numbers in JS
types.setTypeParser(types.builtins.INT8, (val: string) => parseInt(val, 10))

const buildPlaceholderUrl = "postgres://build:build@127.0.0.1:5432/build"

// Railway Postgres has built-in pooling; PgBouncer is for Docker Compose only.
const poolerUrl = process.env.RAILWAY_ENVIRONMENT ? undefined : process.env.DATABASE_POOLER_URL

const connectionString =
  (isNextProductionBuild() ? buildPlaceholderUrl : undefined) ||
  poolerUrl ||
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "postgres://postgres:postgres@127.0.0.1:5432/openwrapper")

if (!connectionString) {
  throw new Error("DATABASE_URL (or DATABASE_POOLER_URL) must be set in production.")
}

const isProduction = process.env.NODE_ENV === "production"
const isBuild = isNextProductionBuild()

/**
 * Production-tuned connection pool.
 *
 * Key settings:
 * - max: 25 connections (Railway Postgres default limit is 100,
 *   leaving headroom for gateway + migrations + admin)
 * - min: 5 warm connections kept alive to avoid cold-start latency
 * - idleTimeoutMillis: 20s — release idle connections faster
 * - connectionTimeoutMillis: 3s — fail fast on overload (100ms during build)
 * - statement_timeout: 10s — prevent runaway queries
 * - application_name: helps identify connections in pg_stat_activity
 */
const globalForDb = globalThis as unknown as {
  _pgPool: Pool | undefined
}

export const pool =
  globalForDb._pgPool ??
  new Pool({
    connectionString,
    max: isBuild ? 1 : isProduction ? 25 : 10,
    min: isBuild ? 0 : isProduction ? 5 : 2,
    idleTimeoutMillis: isBuild ? 100 : isProduction ? 20000 : 30000,
    connectionTimeoutMillis: isBuild ? 100 : isProduction ? 3000 : 5000,
    allowExitOnIdle: isBuild || !isProduction,
    application_name: "openwrapper-web",
    statement_timeout: isBuild ? 500 : 10000,
    keepAlive: !isBuild,
    keepAliveInitialDelayMillis: 10000,
  })

// Preserve single pool instance across module evaluations
globalForDb._pgPool = pool

// Graceful pool error handling — prevents unhandled rejection crashes
pool.on("error", (err) => {
  console.error("[PG Pool] Unexpected idle client error:", err.message)
})

// Graceful shutdown handling on container teardown (prevents TCP reset / SSL unexpected EOF in Postgres logs)
if (typeof process !== "undefined") {
  const shutdown = () => {
    pool.end().catch(() => {})
  }
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
}

export const db = drizzle(pool, { schema })
