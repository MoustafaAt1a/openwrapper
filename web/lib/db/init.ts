import { pool } from "./index"

let isInitialized = false
let initPromise: Promise<void> | null = null

async function runQuery(client: any, sql: string) {
  try {
    await client.query(sql)
  } catch {
    // Non-fatal query error: column might not exist to copy from or index already exists
  }
}

export async function ensureDatabaseSchema() {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    let client
    try {
      client = await pool.connect()

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
      `
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
      `
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
      `
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
      `
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
      `
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
      `
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
      `
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
      `
      )

      // 3. Schema migrations & data propagation
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
        `ALTER TABLE api_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`,
        `UPDATE api_requests SET user_id = "userId" WHERE user_id IS NULL AND "userId" IS NOT NULL;`,
        `UPDATE api_requests SET api_key_id = "apiKeyId" WHERE api_key_id IS NULL AND "apiKeyId" IS NOT NULL;`,
        `UPDATE api_requests SET status_code = "statusCode" WHERE status_code IS NULL AND "statusCode" IS NOT NULL;`,
        `UPDATE api_requests SET latency_ms = "latencyMs" WHERE latency_ms IS NULL AND "latencyMs" IS NOT NULL;`,
        `UPDATE api_requests SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;`,

        // payments
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
        `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments (idempotency_key);`,
      ]

      for (const query of schemaAlters) {
        await runQuery(client, query)
      }

      isInitialized = true
    } catch (error) {
      initPromise = null
      console.error("Database schema initialization failed:", (error as Error).message)
    } finally {
      if (client) {
        client.release()
      }
    }
  })()
  return initPromise
}
