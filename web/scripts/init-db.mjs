import pg from "pg"
const { Pool } = pg

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:400151@127.0.0.1:5432/openwrapper"

console.log("Connecting to PostgreSQL at:", connectionString.replace(/:[^:@]+@/, ":****@"))

const pool = new Pool({ connectionString })

async function main() {
  try {
    const client = await pool.connect()
    console.log("Connected to PostgreSQL successfully!")

    console.log("Creating tables and indexes...")
    
    // 1. Better Auth tables
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
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON "api_keys" ("keyHash");

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

      CREATE TABLE IF NOT EXISTS "webhook_events" (
        "eventId" TEXT PRIMARY KEY,
        "provider" TEXT NOT NULL,
        "paymentId" TEXT,
        "payloadJson" TEXT NOT NULL,
        "signature" TEXT,
        "receivedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

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
      } catch (e) {}
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON "payments" ("userId");`)
    } catch (e) {}

    console.log("All tables and indexes created successfully!")
    client.release()
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error("Database initialization failed:", error)
    await pool.end()
    process.exit(1)
  }
}

main()
