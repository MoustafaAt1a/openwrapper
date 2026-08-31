import { pool } from "./index"

let isInitialized = false
let initPromise: Promise<void> | null = null

export async function ensureDatabaseSchema() {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    let client
    try {
      client = await pool.connect()

      // 1. Better Auth: user table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "user" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "emailVerified" BOOLEAN NOT NULL DEFAULT false,
          "image" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `)

      // 2. Better Auth: session table
      await client.query(`
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
      `)

      // 3. Better Auth: account table
      await client.query(`
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
      `)

      // 4. Better Auth: verification table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "verification" (
          "id" TEXT PRIMARY KEY,
          "identifier" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `)

      // 5. OpenWrapper: api_keys table
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          prefix TEXT NOT NULL,
          last_four TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
      `)

      // 6. OpenWrapper: api_requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_requests (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          api_key_id INTEGER,
          method TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          latency_ms INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON api_requests (user_id);
      `)

      // 7. OpenWrapper: payments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          api_key_id INTEGER,
          idempotency_key TEXT,
          request_fingerprint TEXT,
          provider TEXT,
          provider_reference TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          amount_minor_units BIGINT,
          currency TEXT NOT NULL DEFAULT 'EGP',
          merchant_reference TEXT,
          description TEXT,
          customer_phone TEXT,
          customer_email TEXT,
          customer_name TEXT,
          next_action_type TEXT,
          next_action_payload TEXT,
          metadata_json TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      const paymentAlters = [
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
      ]

      for (const query of paymentAlters) {
        try {
          await client.query(query)
        } catch (e) {}
      }

      try {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);`)
      } catch (e) {}

      // 8. OpenWrapper: webhook_events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS webhook_events (
          event_id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          payment_id TEXT,
          payload_json TEXT,
          signature TEXT,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      const webhookAlters = [
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payment_id TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload_json TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS signature TEXT;`,
        `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();`,
      ]

      for (const query of webhookAlters) {
        try {
          await client.query(query)
        } catch (e) {}
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
