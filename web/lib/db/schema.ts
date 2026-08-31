import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  issuer: text("issuer").notNull().default("credential"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  lastFour: text("last_four").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
})

export const apiRequests = pgTable("api_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  apiKeyId: integer("api_key_id"),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  apiKeyId: integer("api_key_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  status: text("status").notNull().default("pending"),
  amountMinorUnits: integer("amount_minor_units").notNull(),
  currency: text("currency").notNull().default("EGP"),
  merchantReference: text("merchant_reference"),
  description: text("description"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  nextActionType: text("next_action_type"),
  nextActionPayload: text("next_action_payload"),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const webhookEvents = pgTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  provider: text("provider").notNull(),
  paymentId: text("payment_id"),
  payloadJson: text("payload_json"),
  signature: text("signature"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
})

// Legacy table alias for backward compatibility
export const paymentSessions = payments
