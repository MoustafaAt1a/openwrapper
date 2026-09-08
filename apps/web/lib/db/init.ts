import type { PoolClient } from "pg"
import { isNextProductionBuild } from "@/lib/next-build"
import { pool } from "./index"

let isInitialized = false
let initPromise: Promise<void> | null = null
export let isDatabaseAvailable = true
export let lastDatabaseError: string | null = null

async function runQuery(client: PoolClient, sql: string, ignoredCodes: readonly string[] = []) {
  try {
    await client.query(sql)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code && ignoredCodes.includes(code)) return
    throw error
  }
}

export async function ensureDatabaseSchema() {
  // Railway injects DATABASE_URL at image build time; Postgres is not reachable then.
  if (isNextProductionBuild()) return
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    let poolClient: PoolClient | undefined
    try {
      const client = await pool.connect()
      poolClient = client

      // 1. Better Auth tables
      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS "user" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "emailVerified" BOOLEAN NOT NULL DEFAULT false,
          "image" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS "session" (
          "id" TEXT PRIMARY KEY,
          "expiresAt" TIMESTAMP NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS "account" (
          "id" TEXT PRIMARY KEY,
          "accountId" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "issuer" TEXT NOT NULL DEFAULT 'credential',
          "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "accessToken" TEXT,
          "refreshToken" TEXT,
          "idToken" TEXT,
          "accessTokenExpiresAt" TIMESTAMP,
          "refreshTokenExpiresAt" TIMESTAMP,
          "scope" TEXT,
          "password" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS "verification" (
          "id" TEXT PRIMARY KEY,
          "identifier" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `,
      )

      // 2. OpenWrapper core tables
      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS api_keys (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          name TEXT,
          key_hash TEXT,
          prefix TEXT,
          last_four TEXT,
          environment TEXT NOT NULL DEFAULT 'live',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS api_requests (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          api_key_id BIGINT,
          method TEXT,
          endpoint TEXT,
          status_code INTEGER,
          latency_ms INTEGER,
          routing_latency_ms INTEGER,
          environment TEXT NOT NULL DEFAULT 'live',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          api_key_id BIGINT,
          idempotency_key TEXT,
          request_fingerprint TEXT,
          provider TEXT,
          provider_reference TEXT,
          status TEXT DEFAULT 'pending',
          amount_minor_units BIGINT,
          currency TEXT DEFAULT 'EGP',
          merchant_reference TEXT,
          description TEXT,
          customer_phone TEXT,
          customer_email TEXT,
          customer_name TEXT,
          next_action_type TEXT,
          next_action_payload TEXT,
          metadata_json TEXT,
          environment TEXT NOT NULL DEFAULT 'live',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS webhook_events (
          event_id TEXT PRIMARY KEY,
          provider TEXT,
          payment_id TEXT,
          payload_json TEXT,
          signature TEXT,
          received_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      )

      await runQuery(
        client,
        `
        CREATE TABLE IF NOT EXISTS merchant_settings (
          user_id TEXT PRIMARY KEY,
          org_name TEXT NOT NULL DEFAULT 'My Organization',
          billing_email TEXT,
          currency TEXT NOT NULL DEFAULT 'EGP',
          webhook_url TEXT,
          webhook_secret TEXT NOT NULL,
          brand_logo_url TEXT,
          brand_color TEXT DEFAULT '#6366f1',
          brand_name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      )

      // Query information_schema once so legacy drops and updates only run on columns that actually exist
      const existingColsRes = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';`,
      )
      const existingColSet = new Set(
        existingColsRes.rows.map((r) => `${r.table_name}.${r.column_name}`),
      )
      const hasColumn = (table: string, col: string) => existingColSet.has(`${table}.${col}`)

      // 3. Drop NOT NULL constraints on legacy camelCase columns only if they exist
      const legacyDropNotNulls: [table: string, col: string][] = [
        ["api_keys", "userId"],
        ["api_keys", "keyHash"],
        ["api_keys", "prefix"],
        ["api_keys", "lastFour"],
        ["api_keys", "createdAt"],

        ["api_requests", "userId"],
        ["api_requests", "apiKeyId"],
        ["api_requests", "method"],
        ["api_requests", "endpoint"],
        ["api_requests", "statusCode"],
        ["api_requests", "latencyMs"],
        ["api_requests", "createdAt"],

        ["payments", "userId"],
        ["payments", "apiKeyId"],
        ["payments", "idempotencyKey"],
        ["payments", "requestFingerprint"],
        ["payments", "provider"],
        ["payments", "status"],
        ["payments", "amountMinorUnits"],
        ["payments", "currency"],
        ["payments", "createdAt"],
        ["payments", "updatedAt"],

        ["webhook_events", "eventId"],
        ["webhook_events", "provider"],
        ["webhook_events", "paymentId"],
        ["webhook_events", "payloadJson"],
        ["webhook_events", "receivedAt"],
      ]

      for (const [table, col] of legacyDropNotNulls) {
        if (hasColumn(table, col)) {
          await runQuery(client, `ALTER TABLE ${table} ALTER COLUMN "${col}" DROP NOT NULL;`)
        }
      }

      // 4. Schema migrations & data propagation
      const schemaAlters = [
        // api_keys
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS prefix TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_four TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;`,

        // api_requests
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS api_key_id BIGINT;`,
        `ALTER TABLE api_requests ALTER COLUMN api_key_id TYPE BIGINT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS method TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS endpoint TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS status_code INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS latency_ms INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS routing_latency_ms INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,

        // payments
        `ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE payments ALTER COLUMN updated_at SET DEFAULT NOW();`,
        `ALTER TABLE api_keys ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE api_requests ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE webhook_events ALTER COLUMN received_at SET DEFAULT NOW();`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS api_key_id BIGINT;`,
        `ALTER TABLE payments ALTER COLUMN api_key_id TYPE BIGINT;`,
        `ALTER TABLE api_keys ALTER COLUMN id TYPE BIGINT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_reference TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_minor_units BIGINT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EGP';`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant_reference TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_phone TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS next_action_type TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS next_action_payload TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata_json TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'live';`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,

        // webhook_events
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payment_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_json TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();`,

        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);`,
        `CREATE INDEX IF NOT EXISTS idx_api_keys_user_env ON api_keys (user_id, environment);`,
        `CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_api_requests_user_created ON api_requests (user_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_api_requests_user_env ON api_requests (user_id, environment);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments (user_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_user_env ON payments (user_id, environment);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments (idempotency_key);`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user_idempotency ON payments (user_id, idempotency_key) WHERE user_id IS NOT NULL;`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user_env_idempotency ON payments (user_id, environment, idempotency_key) WHERE user_id IS NOT NULL;`,
      ]

      for (const query of schemaAlters) {
        await runQuery(client, query)
      }

      // 5. Copy data from legacy camelCase columns only if both columns exist
      const legacyCopies: [table: string, snakeCol: string, camelCol: string][] = [
        ["api_keys", "user_id", "userId"],
        ["api_keys", "key_hash", "keyHash"],
        ["api_keys", "last_four", "lastFour"],
        ["api_keys", "created_at", "createdAt"],
        ["api_keys", "last_used_at", "lastUsedAt"],
        ["api_keys", "revoked_at", "revokedAt"],

        ["api_requests", "user_id", "userId"],
        ["api_requests", "api_key_id", "apiKeyId"],
        ["api_requests", "status_code", "statusCode"],
        ["api_requests", "latency_ms", "latencyMs"],
        ["api_requests", "created_at", "createdAt"],

        ["payments", "user_id", "userId"],
        ["payments", "api_key_id", "apiKeyId"],
        ["payments", "idempotency_key", "idempotencyKey"],
        ["payments", "request_fingerprint", "requestFingerprint"],
        ["payments", "provider_reference", "providerReference"],
        ["payments", "amount_minor_units", "amountMinorUnits"],
        ["payments", "merchant_reference", "merchantReference"],
        ["payments", "customer_phone", "customerPhone"],
        ["payments", "customer_email", "customerEmail"],
        ["payments", "customer_name", "customerName"],
        ["payments", "next_action_type", "nextActionType"],
        ["payments", "next_action_payload", "nextActionPayload"],
        ["payments", "metadata_json", "metadataJson"],
        ["payments", "created_at", "createdAt"],
        ["payments", "updated_at", "updatedAt"],

        ["webhook_events", "event_id", "eventId"],
        ["webhook_events", "payment_id", "paymentId"],
        ["webhook_events", "payload_json", "payloadJson"],
        ["webhook_events", "received_at", "receivedAt"],
      ]

      for (const [table, snakeCol, camelCol] of legacyCopies) {
        if (hasColumn(table, camelCol) && hasColumn(table, snakeCol)) {
          await runQuery(
            client,
            `UPDATE ${table} SET ${snakeCol} = "${camelCol}" WHERE ${snakeCol} IS NULL AND "${camelCol}" IS NOT NULL;`,
          )
        }
      }

      await runQuery(
        client,
        `UPDATE api_keys SET environment = 'test' WHERE prefix LIKE 'ow_test%' OR prefix = 'ow_demo_sand';`,
      )
      await runQuery(
        client,
        `UPDATE api_requests SET environment = 'test' WHERE user_id = 'usr_sandbox_demo';`,
      )
      await runQuery(
        client,
        `UPDATE payments SET environment = 'test' WHERE user_id = 'usr_sandbox_demo' OR metadata_json LIKE '%"environment":"test"%';`,
      )

      isInitialized = true
      isDatabaseAvailable = true
      lastDatabaseError = null
    } catch (error) {
      initPromise = null
      isDatabaseAvailable = false
      lastDatabaseError = (error as Error).message
      console.warn(
        "Database schema initialization skipped (offline/connection failure):",
        lastDatabaseError,
      )
      if (process.env.NODE_ENV === "production" && !isNextProductionBuild()) {
        throw error
      }
    } finally {
      if (poolClient) {
        poolClient.release()
      }
    }
  })()
  return initPromise
}
