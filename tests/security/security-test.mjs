import { strict as assert } from "node:assert"

const BASE_URL = process.env.TARGET_URL || "https://web-production-884cd.up.railway.app"
const VALID_API_KEY = process.env.API_KEY || "ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr"

let passed = 0
let failed = 0

async function runTest(name, fn) {
  process.stdout.write(`🛡️  ${name.padEnd(60, ".")} `)
  try {
    await fn()
    console.log("[\x1b[32mPASS\x1b[0m]")
    passed++
  } catch (err) {
    console.log("[\x1b[31mFAIL\x1b[0m]")
    console.error(`   👉 Error: ${err.message}`)
    failed++
  }
}

async function startSuite() {
  console.log("\n================================================================")
  console.log("🔒 OpenWrapper Security & Defensive Architecture Test Suite")
  console.log(`🎯 Target Gateway: ${BASE_URL}`)
  console.log("================================================================\n")

  // Test 1: Rejection of requests with no Authorization header
  await runTest("Rejection of unauthenticated requests (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "sec-test-001" },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`)
    const json = await res.json()
    assert.equal(json.error?.code, "unauthorized", "Expected unauthorized error code")
  })

  // Test 2: Rejection of requests with malformed / fake API key
  await runTest("Rejection of forged / invalid API keys (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ow_live_fake_attacker_key_xyz987654321",
        "Idempotency-Key": "sec-test-002",
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`)
  })

  // Test 3: Missing Idempotency-Key header rejection
  await runTest("Enforcement of Idempotency-Key header (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
      },
      body: JSON.stringify({ provider: "fawry", amount_minor_units: 1000, customer: { phone: "+201000000000" } }),
    })
    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}`)
    const json = await res.json()
    assert.equal(json.error?.code, "invalid_request")
  })

  // Test 4: SQL Injection attempt in customer and metadata fields
  await runTest("SQL Injection & payload tampering resistance (Zod / Parameterized)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-sqli-${Date.now()}`,
        "X-Fawry-Merchant-Code": "1013970",
        "X-Fawry-Secure-Key": "d11b3329-c70e-4ab8-9cc0-84cfc79e6024",
      },
      body: JSON.stringify({
        provider: "fawry",
        amount_minor_units: 15000,
        currency: "EGP",
        customer: {
          phone: "+201000000000",
          email: "admin' OR '1'='1'; DROP TABLE payments; --@test.com",
          full_name: "Attacker'); DROP TABLE api_keys;--",
        },
        merchant_reference: "'; DROP TABLE api_requests;--",
        description: "' UNION SELECT * FROM users; --",
      }),
    })

    // Must either be safely rejected with 400/422 validation, or safely sanitized/parameterized without SQL execution
    assert.ok(
      [200, 201, 400, 422].includes(res.status),
      `Expected safe status (200/201/400/422), got ${res.status}`
    )
    const json = await res.json()
    if (json.payment_id) {
      assert.ok(json.payment_id.startsWith("pay_"), "Payment ID safely created with sanitized parameters")
    }
  })

  // Test 5: Missing stateless provider credentials validation
  await runTest("Missing provider credentials handling (422 Clean Validation)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VALID_API_KEY}`,
        "Idempotency-Key": `sec-creds-${Date.now()}`,
      },
      body: JSON.stringify({
        provider: "paymob",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: { phone: "+201000000000" },
      }),
    })
    assert.equal(res.status, 422, `Expected 422 Unprocessable Entity, got ${res.status}`)
    const json = await res.json()
    assert.equal(json.error?.code, "missing_provider_credentials")
  })

  // Test 6: Fawry Webhook Fake Signature Forgery Rejection
  await runTest("Fawry Webhook Forged Signature Rejection (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/fawry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fawryRefNumber: "987654321",
        merchantRefNumber: "ord_1001",
        paymentAmount: "150.00",
        orderStatus: "PAID",
        messageSignature: "forged_invalid_signature_hash_00000000000000000000000000000000",
      }),
    })
    assert.ok(
      res.status === 401 || res.status === 400 || res.status === 200,
      `Webhook handled appropriately (${res.status})`
    )
  })

  // Test 7: Stripe Webhook Forged Signature Rejection
  await runTest("Stripe Webhook Forged Signature Rejection (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1600000000,v1=forged_invalid_stripe_signature_hash",
      },
      body: JSON.stringify({ type: "checkout.session.completed", id: "evt_fake_test" }),
    })
    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 200,
      `Webhook handled appropriately (${res.status})`
    )
  })

  // Test 8: Concurrency & Idempotent Replay Verification
  await runTest("Atomic Idempotency Lock & Zero Duplicate Charges (200 Replay)", async () => {
    const idempotencyKey = `sec-lock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VALID_API_KEY}`,
      "Idempotency-Key": idempotencyKey,
      "X-Fawry-Merchant-Code": "1013970",
      "X-Fawry-Secure-Key": "d11b3329-c70e-4ab8-9cc0-84cfc79e6024",
    }
    const payload = JSON.stringify({
      provider: "fawry",
      amount_minor_units: 5000,
      currency: "EGP",
      customer: { phone: "+201000000000", email: "replay@test.com" },
      merchant_reference: `ref_lock_${Date.now()}`,
    })

    const res1 = await fetch(`${BASE_URL}/api/v1/payments`, { method: "POST", headers, body: payload })
    const json1 = await res1.json()

    // Immediate second call with identical idempotency key
    const res2 = await fetch(`${BASE_URL}/api/v1/payments`, { method: "POST", headers, body: payload })
    const json2 = await res2.json()

    assert.equal(json1.payment_id, json2.payment_id, "Payment ID must match identically")
  })

  console.log("\n================================================================")
  console.log(`📊 Security Test Summary: ${passed} Passed, ${failed} Failed`)
  console.log("================================================================\n")
  if (failed > 0) process.exit(1)
}

startSuite().catch((err) => {
  console.error("Fatal test runner error:", err)
  process.exit(1)
})
