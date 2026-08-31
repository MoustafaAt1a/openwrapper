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
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  keyHash: text("keyHash").notNull().unique(),
  prefix: text("prefix").notNull(),
  lastFour: text("lastFour").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
})

export const apiRequests = pgTable("api_requests", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  apiKeyId: integer("apiKeyId"),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("statusCode").notNull(),
  latencyMs: integer("latencyMs").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const payments = pgTable("payments", {
  id: text("id").primaryKey(), // pay_... or ULID
  userId: text("userId").notNull(),
  apiKeyId: integer("apiKeyId"),
  idempotencyKey: text("idempotencyKey").notNull(),
  requestFingerprint: text("requestFingerprint").notNull(),
  provider: text("provider").notNull(), // paymob | fawry | stripe | mock_paymob | mock_fawry
  providerReference: text("providerReference"),
  status: text("status").notNull().default("pending"), // pending | succeeded | failed | unknown
  amountMinorUnits: integer("amountMinorUnits").notNull(),
  currency: text("currency").notNull().default("EGP"),
  merchantReference: text("merchantReference"),
  description: text("description"),
  customerPhone: text("customerPhone"),
  customerEmail: text("customerEmail"),
  customerName: text("customerName"),
  nextActionType: text("nextActionType"), // redirect_to_url | pay_at_reference
  nextActionPayload: text("nextActionPayload"), // URL or reference string
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const webhookEvents = pgTable("webhook_events", {
  eventId: text("eventId").primaryKey(),
  provider: text("provider").notNull(),
  paymentId: text("paymentId"),
  payloadJson: text("payloadJson").notNull(),
  signature: text("signature"),
  receivedAt: timestamp("receivedAt").notNull().defaultNow(),
})

// Legacy table alias for backward compatibility
export const paymentSessions = payments
