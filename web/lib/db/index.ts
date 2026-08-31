import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:400151@127.0.0.1:5432/openwrapper"

const globalForDb = globalThis as unknown as {
  _pgPool: Pool | undefined
}

export const pool =
  globalForDb._pgPool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 20 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgPool = pool
}

export const db = drizzle(pool, { schema })

