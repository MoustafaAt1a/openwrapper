import { createHash, randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { apiKeys, apiRequests, payments, user } from "@/lib/db/schema"
import { hashApiKey } from "@/lib/api-keys"

function ulidLike() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, "0")
  const r = randomBytes(8).toString("hex").toUpperCase()
  return `01${t}${r}`.slice(0, 26)
}

function daysAgo(n: number, hour = 12, minute = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(hour, minute, 0, 0)
  return d
}

const DEMO_PAYMENTS = [
  { daysAgo: 0, provider: "fawry", status: "unknown", amount: 7500, nextType: "pay_at_reference", nextPayload: "FAW-882910", currency: "EGP" },
  { daysAgo: 0, provider: "paymob", status: "pending", amount: 10000, nextType: "redirect_to_url", nextPayload: "https://accept.paymob.com/demo", currency: "EGP" },
  { daysAgo: 1, provider: "fawry", status: "succeeded", amount: 5000, currency: "EGP" },
  { daysAgo: 1, provider: "stripe", status: "succeeded", amount: 2499, currency: "USD" },
  { daysAgo: 2, provider: "paymob", status: "succeeded", amount: 15000, currency: "EGP" },
  { daysAgo: 2, provider: "fawry", status: "failed", amount: 3200, currency: "EGP" },
  { daysAgo: 3, provider: "paymob", status: "succeeded", amount: 8900, currency: "EGP" },
  { daysAgo: 3, provider: "fawry", status: "unknown", amount: 4500, nextType: "pay_at_reference", nextPayload: "FAW-441022", currency: "EGP" },
  { daysAgo: 4, provider: "stripe", status: "succeeded", amount: 4999, currency: "USD" },
  { daysAgo: 5, provider: "paymob", status: "succeeded", amount: 22000, currency: "EGP" },
  { daysAgo: 6, provider: "fawry", status: "succeeded", amount: 6700, currency: "EGP" },
  { daysAgo: 10, provider: "paymob", status: "succeeded", amount: 12500, currency: "EGP" },
  { daysAgo: 14, provider: "fawry", status: "succeeded", amount: 9800, currency: "EGP" },
  { daysAgo: 21, provider: "stripe", status: "succeeded", amount: 1999, currency: "USD" },
  { daysAgo: 28, provider: "paymob", status: "succeeded", amount: 31000, currency: "EGP" },
] as const

export async function seedDashboardDemoForUser(userId: string, apiKeyId: number, email: string) {
  await db.delete(payments).where(eq(payments.userId, userId))
  await db.delete(apiRequests).where(eq(apiRequests.userId, userId))

  for (const [i, p] of DEMO_PAYMENTS.entries()) {
    const id = ulidLike()
    const createdAt = daysAgo(p.daysAgo, 10 + i, (i * 7) % 60)
    const idempotencyKey = `demo_${p.daysAgo}d_${i}_${Date.now()}`
    await db.insert(payments).values({
      id,
      userId,
      apiKeyId,
      idempotencyKey,
      requestFingerprint: createHash("sha256").update(idempotencyKey).digest("hex"),
      provider: p.provider,
      providerReference: p.status === "succeeded" ? `${p.provider.toUpperCase()}-REF-${i}` : null,
      status: p.status,
      amountMinorUnits: p.amount,
      currency: p.currency,
      merchantReference: `demo-order-${p.daysAgo}d-${i}`,
      description: `Demo payment day -${p.daysAgo}`,
      customerPhone: "+201001234567",
      customerEmail: email,
      customerName: "Moustafa Mahmoud",
      nextActionType: "nextType" in p ? p.nextType : null,
      nextActionPayload: "nextPayload" in p ? p.nextPayload : null,
      metadataJson: "{}",
      createdAt,
      updatedAt: createdAt,
    })
  }

  for (let day = 6; day >= 0; day--) {
    const base = daysAgo(day, 14, 0)
    const successCount = 3 + (day % 3)
    const errorCount = day <= 1 ? 8 : day === 2 ? 4 : 1

    for (let s = 0; s < successCount; s++) {
      const at = new Date(base.getTime() + s * 90_000)
      await db.insert(apiRequests).values({
        userId,
        apiKeyId,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: 201,
        latencyMs: 45 + s * 12,
        routingLatencyMs: 12 + s * 3,
        createdAt: at,
      })
    }
    for (let e = 0; e < errorCount; e++) {
      const at = new Date(base.getTime() + (successCount + e) * 90_000)
      await db.insert(apiRequests).values({
        userId,
        apiKeyId,
        method: "POST",
        endpoint: "/api/v1/payments",
        statusCode: e % 2 === 0 ? 401 : 422,
        latencyMs: 28 + e * 5,
        routingLatencyMs: 10 + e * 2,
        createdAt: at,
      })
    }
  }

  for (const day of [10, 14, 21, 28]) {
    const at = daysAgo(day, 16, 30)
    await db.insert(apiRequests).values({
      userId,
      apiKeyId,
      method: "POST",
      endpoint: "/api/v1/payments",
      statusCode: 201,
      latencyMs: 52,
      routingLatencyMs: 15,
      createdAt: at,
    })
  }

  return { payments: DEMO_PAYMENTS.length, apiRequestDays: 7 }
}

export async function seedDashboardDemoByEmail(email: string, apiKey: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (!row) throw new Error(`User not found: ${email}`)

  const keyHash = hashApiKey(apiKey)
  const [key] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1)
  if (!key) throw new Error("API key not found")

  return seedDashboardDemoForUser(row.id, key.id, email)
}
