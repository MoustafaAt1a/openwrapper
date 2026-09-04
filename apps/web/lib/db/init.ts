import type { PoolClient } from "pg"
import { isNextProductionBuild } from "@/lib/next-build"
import { pool } from "./index"

let isInitialized = false
let initPromise: Promise<void> | null = null

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
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          name TEXT,
          key_hash TEXT,
          prefix TEXT,
          last_four TEXT,
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
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          api_key_id INTEGER,
          method TEXT,
          endpoint TEXT,
          status_code INTEGER,
          latency_ms INTEGER,
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
          api_key_id INTEGER,
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

      // 3. Drop NOT NULL constraints on legacy camelCase columns to prevent insert violations
      const dropNotNulls = [
        `ALTER TABLE api_keys ALTER COLUMN "userId" DROP NOT NULL;`,
        `ALTER TABLE api_keys ALTER COLUMN "keyHash" DROP NOT NULL;`,
        `ALTER TABLE api_keys ALTER COLUMN "prefix" DROP NOT NULL;`,
        `ALTER TABLE api_keys ALTER COLUMN "lastFour" DROP NOT NULL;`,
        `ALTER TABLE api_keys ALTER COLUMN "createdAt" DROP NOT NULL;`,

        `ALTER TABLE api_requests ALTER COLUMN "userId" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "apiKeyId" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "method" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "endpoint" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "statusCode" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "latencyMs" DROP NOT NULL;`,
        `ALTER TABLE api_requests ALTER COLUMN "createdAt" DROP NOT NULL;`,

        `ALTER TABLE payments ALTER COLUMN "userId" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "apiKeyId" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "idempotencyKey" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "requestFingerprint" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "provider" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "status" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "amountMinorUnits" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "currency" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "createdAt" DROP NOT NULL;`,
        `ALTER TABLE payments ALTER COLUMN "updatedAt" DROP NOT NULL;`,

        `ALTER TABLE webhook_events ALTER COLUMN "eventId" DROP NOT NULL;`,
        `ALTER TABLE webhook_events ALTER COLUMN "provider" DROP NOT NULL;`,
        `ALTER TABLE webhook_events ALTER COLUMN "paymentId" DROP NOT NULL;`,
        `ALTER TABLE webhook_events ALTER COLUMN "payloadJson" DROP NOT NULL;`,
        `ALTER TABLE webhook_events ALTER COLUMN "receivedAt" DROP NOT NULL;`,
      ]

      for (const query of dropNotNulls) {
        await runQuery(client, query, ["42703"])
      }

      // 4. Schema migrations & data propagation
      const schemaAlters = [
        // api_keys
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS name TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS prefix TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_four TEXT;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;`,
        `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;`,
        `UPDATE api_keys SET user_id = "userId" WHERE user_id IS NULL AND "userId" IS NOT NULL;`,
        `UPDATE api_keys SET key_hash = "keyHash" WHERE key_hash IS NULL AND "keyHash" IS NOT NULL;`,
        `UPDATE api_keys SET last_four = "lastFour" WHERE last_four IS NULL AND "lastFour" IS NOT NULL;`,
        `UPDATE api_keys SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;`,
        `UPDATE api_keys SET last_used_at = "lastUsedAt" WHERE last_used_at IS NULL AND "lastUsedAt" IS NOT NULL;`,
        `UPDATE api_keys SET revoked_at = "revokedAt" WHERE revoked_at IS NULL AND "revokedAt" IS NOT NULL;`,

        // api_requests
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS api_key_id INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS method TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS endpoint TEXT;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS status_code INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS latency_ms INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS routing_latency_ms INTEGER;`,
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `UPDATE api_requests SET user_id = "userId" WHERE user_id IS NULL AND "userId" IS NOT NULL;`,
        `UPDATE api_requests SET api_key_id = "apiKeyId" WHERE api_key_id IS NULL AND "apiKeyId" IS NOT NULL;`,
        `UPDATE api_requests SET status_code = "statusCode" WHERE status_code IS NULL AND "statusCode" IS NOT NULL;`,
        `UPDATE api_requests SET latency_ms = "latencyMs" WHERE latency_ms IS NULL AND "latencyMs" IS NOT NULL;`,
        `UPDATE api_requests SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;`,

        // payments
        `ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE payments ALTER COLUMN updated_at SET DEFAULT NOW();`,
        `ALTER TABLE api_keys ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE api_requests ALTER COLUMN created_at SET DEFAULT NOW();`,
        `ALTER TABLE webhook_events ALTER COLUMN received_at SET DEFAULT NOW();`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id TEXT;`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS api_key_id INTEGER;`,
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
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
        `UPDATE payments SET user_id = "userId" WHERE user_id IS NULL AND "userId" IS NOT NULL;`,
        `UPDATE payments SET api_key_id = "apiKeyId" WHERE api_key_id IS NULL AND "apiKeyId" IS NOT NULL;`,
        `UPDATE payments SET idempotency_key = "idempotencyKey" WHERE idempotency_key IS NULL AND "idempotencyKey" IS NOT NULL;`,
        `UPDATE payments SET request_fingerprint = "requestFingerprint" WHERE request_fingerprint IS NULL AND "requestFingerprint" IS NOT NULL;`,
        `UPDATE payments SET provider_reference = "providerReference" WHERE provider_reference IS NULL AND "providerReference" IS NOT NULL;`,
        `UPDATE payments SET amount_minor_units = "amountMinorUnits" WHERE amount_minor_units IS NULL AND "amountMinorUnits" IS NOT NULL;`,
        `UPDATE payments SET merchant_reference = "merchantReference" WHERE merchant_reference IS NULL AND "merchantReference" IS NOT NULL;`,
        `UPDATE payments SET customer_phone = "customerPhone" WHERE customer_phone IS NULL AND "customerPhone" IS NOT NULL;`,
        `UPDATE payments SET customer_email = "customerEmail" WHERE customer_email IS NULL AND "customerEmail" IS NOT NULL;`,
        `UPDATE payments SET customer_name = "customerName" WHERE customer_name IS NULL AND "customerName" IS NOT NULL;`,
        `UPDATE payments SET next_action_type = "nextActionType" WHERE next_action_type IS NULL AND "nextActionType" IS NOT NULL;`,
        `UPDATE payments SET next_action_payload = "nextActionPayload" WHERE next_action_payload IS NULL AND "nextActionPayload" IS NOT NULL;`,
        `UPDATE payments SET metadata_json = "metadataJson" WHERE metadata_json IS NULL AND "metadataJson" IS NOT NULL;`,
        `UPDATE payments SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;`,
        `UPDATE payments SET updated_at = "updatedAt" WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL;`,

        // webhook_events
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payment_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_json TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();`,
        `UPDATE webhook_events SET event_id = "eventId" WHERE event_id IS NULL AND "eventId" IS NOT NULL;`,
        `UPDATE webhook_events SET payment_id = "paymentId" WHERE payment_id IS NULL AND "paymentId" IS NOT NULL;`,
        `UPDATE webhook_events SET payload_json = "payloadJson" WHERE payload_json IS NULL AND "payloadJson" IS NOT NULL;`,
        `UPDATE webhook_events SET received_at = "receivedAt" WHERE received_at IS NULL AND "receivedAt" IS NOT NULL;`,

        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);`,
        `CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_api_requests_user_created ON api_requests (user_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments (user_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments (idempotency_key);`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_user_idempotency ON payments (user_id, idempotency_key) WHERE user_id IS NOT NULL;`,
      ]

      for (const query of schemaAlters) {
        const copiesLegacyColumn = query.startsWith("UPDATE ") && query.includes('"')
        await runQuery(client, query, copiesLegacyColumn ? ["42703"] : [])
      }

      isInitialized = true
    } catch (error) {
      initPromise = null
      console.error("Database schema initialization failed:", (error as Error).message)
      throw error
    } finally {
      if (poolClient) {
        poolClient.release()
      }
    }
  })()
  return initPromise
}
