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
        CREATE TABLE IF NOT EXISTS "api_keys" (
          "id" SERIAL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "keyHash" TEXT NOT NULL UNIQUE,
          "prefix" TEXT NOT NULL,
          "lastFour" TEXT NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "lastUsedAt" TIMESTAMP,
          "revokedAt" TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON "api_keys" ("keyHash");
      `)

      // 6. OpenWrapper: api_requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "api_requests" (
          "id" SERIAL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "apiKeyId" INTEGER,
          "method" TEXT NOT NULL,
          "endpoint" TEXT NOT NULL,
          "statusCode" INTEGER NOT NULL,
          "latencyMs" INTEGER NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON "api_requests" ("userId");
      `)

      // 7. OpenWrapper: payments table & columns
      await client.query(`
        CREATE TABLE IF NOT EXISTS "payments" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT,
          "apiKeyId" INTEGER,
          "idempotencyKey" TEXT,
          "requestFingerprint" TEXT,
          "provider" TEXT,
          "providerReference" TEXT,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "amountMinorUnits" INTEGER,
          "currency" TEXT NOT NULL DEFAULT 'EGP',
          "merchantReference" TEXT,
          "description" TEXT,
          "customerPhone" TEXT,
          "customerEmail" TEXT,
          "customerName" TEXT,
          "nextActionType" TEXT,
          "nextActionPayload" TEXT,
          "metadataJson" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `)

      // Ensure all columns exist if table was previously created by Rust gateway
      const paymentColumns = [
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "apiKeyId" INTEGER`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "requestFingerprint" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerReference" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amountMinorUnits" INTEGER`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'EGP'`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "merchantReference" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "customerName" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "nextActionType" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "nextActionPayload" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadataJson" TEXT`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW()`,
        `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()`,
      ]

      for (const colQuery of paymentColumns) {
        try {
          await client.query(colQuery)
        } catch (e) {
          // Ignore individual alter errors if column already exists
        }
      }

      // 8. Safe indexes
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON "payments" ("userId");`)
      } catch (e) {}

      // 9. Webhook events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "webhook_events" (
          "eventId" TEXT PRIMARY KEY,
          "provider" TEXT NOT NULL,
          "paymentId" TEXT,
          "payloadJson" TEXT NOT NULL,
          "signature" TEXT,
          "receivedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `)

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
