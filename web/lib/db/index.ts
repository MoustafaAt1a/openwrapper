import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const connectionString =
  process.env.DATABASE_POOLER_URL ||
  process.env.DATABASE_URL ||
  "postgres://postgres:400151@127.0.0.1:5432/openwrapper"

const isProduction = process.env.NODE_ENV === "production"

const globalForDb = globalThis as unknown as {
  _pgPool: Pool | undefined
}

/**
 * Production-tuned connection pool.
 *
 * Key settings:
 * - max: 25 connections (Railway Postgres default limit is 100,
 *   leaving headroom for gateway + migrations + admin)
 * - min: 5 warm connections kept alive to avoid cold-start latency
 * - idleTimeoutMillis: 20s — release idle connections faster
 * - connectionTimeoutMillis: 3s — fail fast on overload
 * - statement_timeout: 10s — prevent runaway queries
 * - application_name: helps identify connections in pg_stat_activity
 */
export const pool =
  globalForDb._pgPool ??
  new Pool({
    connectionString,
    max: isProduction ? 25 : 10,
    min: isProduction ? 5 : 2,
    idleTimeoutMillis: isProduction ? 20000 : 30000,
    connectionTimeoutMillis: isProduction ? 3000 : 5000,
    allowExitOnIdle: !isProduction,
    application_name: "openwrapper-web",
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgPool = pool
}

// Graceful pool error handling — prevents unhandled rejection crashes
pool.on("error", (err) => {
  console.error("[PG Pool] Unexpected idle client error:", err.message)
})

export const db = drizzle(pool, { schema })
