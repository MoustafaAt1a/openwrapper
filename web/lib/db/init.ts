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

        CREATE TABLE IF NOT EXISTS "verification" (
          "id" TEXT PRIMARY KEY,
          "identifier" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expiresAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );

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

        CREATE TABLE IF NOT EXISTS "payments" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "apiKeyId" INTEGER,
          "idempotencyKey" TEXT NOT NULL,
          "requestFingerprint" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "providerReference" TEXT,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "amountMinorUnits" INTEGER NOT NULL,
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

        CREATE INDEX IF NOT EXISTS idx_payments_user_id ON "payments" ("userId");
        CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON "payments" ("userId", "idempotencyKey");
        CREATE INDEX IF NOT EXISTS idx_api_requests_user_id ON "api_requests" ("userId");
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON "api_keys" ("keyHash");

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
      console.warn("Database schema auto-init failed:", (error as Error).message)
    } finally {
      if (client) {
        client.release()
      }
    }
  })()
  return initPromise
}
