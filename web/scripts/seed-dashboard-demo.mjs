/**
 * Seed dashboard demo data for a user — payments + API requests spread across dates.
 *
 * Usage (Railway):
 *   railway run --service web node scripts/seed-dashboard-demo.mjs
 *
 * Usage (local):
 *   DATABASE_URL=postgres://... node scripts/seed-dashboard-demo.mjs
 */
import { createHash, randomBytes } from "node:crypto"
import pg from "pg"

const EMAIL = process.env.SEED_USER_EMAIL ?? "MoustafaMahmoudAtta2284@gmail.com"
const API_KEY = process.env.SEED_API_KEY ?? "ow_live_CtU-HqNZ48J32sxnaF__0mODZ2UgYkGe"
const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DATABASE_POOLER_URL

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

function hashApiKey(key) {
  return createHash("sha256").update(key.trim()).digest("hex")
}

function ulidLike() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, "0")
  const r = randomBytes(8).toString("hex").toUpperCase()
  return `01${t}${r}`.slice(0, 26)
}

function daysAgo(n, hour = 12, minute = 0) {
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
]

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const userRes = await client.query(`SELECT id, name FROM "user" WHERE lower(email) = lower($1) LIMIT 1`, [EMAIL])
  if (!userRes.rows.length) {
    console.error(`User not found: ${EMAIL}`)
    process.exit(1)
  }
  const userId = userRes.rows[0].id
  console.log(`User: ${userRes.rows[0].name} (${userId})`)

  const keyHash = hashApiKey(API_KEY)
  const keyRes = await client.query(
    `SELECT id, prefix FROM api_keys WHERE user_id = $1 AND key_hash = $2 AND revoked_at IS NULL LIMIT 1`,
    [userId, keyHash]
  )
  if (!keyRes.rows.length) {
    console.error("API key not found for user — create it in the dashboard first.")
    process.exit(1)
  }
  const apiKeyId = keyRes.rows[0].id
  console.log(`API key id: ${apiKeyId} (${keyRes.rows[0].prefix}…)`)

  await client.query("BEGIN")

  const delPay = await client.query(`DELETE FROM payments WHERE user_id = $1`, [userId])
  const delReq = await client.query(`DELETE FROM api_requests WHERE user_id = $1`, [userId])
  console.log(`Cleared ${delPay.rowCount} payments, ${delReq.rowCount} API requests`)

  for (const [i, p] of DEMO_PAYMENTS.entries()) {
    const id = ulidLike()
    const createdAt = daysAgo(p.daysAgo, 10 + i, (i * 7) % 60)
    const idempotencyKey = `demo_${p.daysAgo}d_${i}_${Date.now()}`
    await client.query(
      `INSERT INTO payments (
        id, user_id, api_key_id, idempotency_key, request_fingerprint,
        provider, provider_reference, status, amount_minor_units, currency,
        merchant_reference, description, customer_phone, customer_email, customer_name,
        next_action_type, next_action_payload, metadata_json, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $19
      )`,
      [
        id,
        userId,
        apiKeyId,
        idempotencyKey,
        createHash("sha256").update(idempotencyKey).digest("hex"),
        p.provider,
        p.status === "succeeded" ? `${p.provider.toUpperCase()}-REF-${i}` : null,
        p.status,
        p.amount,
        p.currency,
        `demo-order-${p.daysAgo}d-${i}`,
        `Demo payment day -${p.daysAgo}`,
        "+201001234567",
        EMAIL,
        "Moustafa Mahmoud",
        p.nextType ?? null,
        p.nextPayload ?? null,
        "{}",
        createdAt,
      ]
    )
  }
  console.log(`Inserted ${DEMO_PAYMENTS.length} demo payments`)

  // API requests: spread successes/errors across last 7 days
  for (let day = 6; day >= 0; day--) {
    const base = daysAgo(day, 14, 0)
    const successCount = 3 + (day % 3)
    const errorCount = day <= 1 ? 8 : day === 2 ? 4 : 1

    for (let s = 0; s < successCount; s++) {
      const at = new Date(base.getTime() + s * 90_000)
      await client.query(
        `INSERT INTO api_requests (user_id, api_key_id, method, endpoint, status_code, latency_ms, routing_latency_ms, created_at)
         VALUES ($1, $2, 'POST', '/api/v1/payments', 201, $3, $4, $5)`,
        [userId, apiKeyId, 45 + s * 12, 12 + s * 3, at]
      )
    }
    for (let e = 0; e < errorCount; e++) {
      const at = new Date(base.getTime() + (successCount + e) * 90_000)
      const code = e % 2 === 0 ? 401 : 422
      await client.query(
        `INSERT INTO api_requests (user_id, api_key_id, method, endpoint, status_code, latency_ms, routing_latency_ms, created_at)
         VALUES ($1, $2, 'POST', '/api/v1/payments', $3, $4, $5, $6)`,
        [userId, apiKeyId, code, 28 + e * 5, 10 + e * 2, at]
      )
    }
  }

  // Older month requests for 30d chart
  for (const day of [10, 14, 21, 28]) {
    const at = daysAgo(day, 16, 30)
    await client.query(
      `INSERT INTO api_requests (user_id, api_key_id, method, endpoint, status_code, latency_ms, routing_latency_ms, created_at)
       VALUES ($1, $2, 'POST', '/api/v1/payments', 201, 52, 15, $3)`,
      [userId, apiKeyId, at]
    )
  }

  await client.query("COMMIT")
  console.log("Done — refresh the dashboard to see updated metrics.")
  await client.end()
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
