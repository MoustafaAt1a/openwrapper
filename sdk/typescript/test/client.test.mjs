import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatMajorUnits,
  GatewayTimeoutError,
  GatewayUnreachableError,
  IdempotencyConflictError,
  OpenWrapperClient,
  RateLimitError,
  toMinorUnits,
  ValidationError,
  webhooks,
} from "../dist/index.js"

function fakeFetch(handler) {
  return async (input, init) => handler(String(input), init ?? {})
}

test("create() sends an Idempotency-Key header even when the caller doesn't supply one", async () => {
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: "txn-1",
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
          next_action: { type: "redirect_to_url", url: "https://accept.paymob.com/..." },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      )
    }),
  })

  const payment = await client.payments.create({
    provider: "paymob",
    amountMinorUnits: 1000,
    currency: "EGP",
    customer: { phone: "+201234567890" },
  })

  assert.ok(capturedHeaders?.["Idempotency-Key"], "an Idempotency-Key header must always be sent")
  assert.equal(payment.paymentId, "01ABC")
  assert.equal(payment.status, "pending")
  assert.deepEqual(payment.nextAction, {
    type: "redirect_to_url",
    url: "https://accept.paymob.com/...",
  })
})

test("caller-supplied idempotency key is passed through unchanged", async () => {
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "fawry",
          provider_reference: "MR-1",
          status: "pending",
          amount_minor_units: 500,
          currency: "EGP",
          merchant_reference: "order-7",
        }),
        { status: 201 },
      )
    }),
  })

  await client.payments.create(
    { provider: "fawry", amountMinorUnits: 500, currency: "EGP", customer: { phone: "+2010" } },
    { idempotencyKey: "order-7" },
  )

  assert.equal(capturedHeaders?.["Idempotency-Key"], "order-7")
})

test("a 400 validation response is thrown as ValidationError with the server's message", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(
          JSON.stringify({ error: { code: "validation_error", message: "invalid amount" } }),
          {
            status: 400,
          },
        ),
    ),
  })

  await assert.rejects(
    () =>
      client.payments.create({
        provider: "paymob",
        amountMinorUnits: 1,
        currency: "EGP",
        customer: { phone: "1" },
      }),
    (err) => {
      assert.ok(err instanceof ValidationError)
      assert.equal(err.message, "invalid amount")
      assert.equal(err.httpStatus, 400)
      return true
    },
  )
})

test("a 409 conflict response is thrown as IdempotencyConflictError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(
          JSON.stringify({
            error: {
              code: "idempotency_conflict",
              message: "idempotency key reused with different request payload",
            },
          }),
          {
            status: 409,
          },
        ),
    ),
  })

  await assert.rejects(
    () =>
      client.payments.create({
        provider: "paymob",
        amountMinorUnits: 1000,
        currency: "EGP",
        customer: { phone: "+201000000000" },
      }),
    (err) => {
      assert.ok(err instanceof IdempotencyConflictError)
      assert.equal(err.code, "idempotency_conflict")
      assert.equal(err.httpStatus, 409)
      return true
    },
  )
})

test("a 429 response is thrown as RateLimitError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(JSON.stringify({ error: { code: "rate_limit", message: "slow down" } }), {
          status: 429,
        }),
    ),
  })

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof RateLimitError,
  )
})

test("a network failure reaching the gateway itself throws GatewayUnreachableError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED")
    },
  })

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof GatewayUnreachableError,
  )
})

test("an unknown-outcome payment is a normal return value, not a thrown error", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(
          JSON.stringify({
            payment_id: "01ABC",
            provider: "paymob",
            provider_reference: null,
            status: "unknown",
            amount_minor_units: 1000,
            currency: "EGP",
            merchant_reference: null,
          }),
          { status: 200 },
        ),
    ),
  })

  const payment = await client.payments.get("01ABC")
  assert.equal(payment.status, "unknown")
})

test("apiKey option is propagated as X-API-Key header in requests", async () => {
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    apiKey: "test-secret-key-123",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: null,
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
        }),
        { status: 200 },
      )
    }),
  })

  await client.payments.get("01ABC")
  assert.equal(capturedHeaders?.["X-API-Key"], "test-secret-key-123")
})

test("client retries transient network errors up to maxRetries", async () => {
  let callCount = 0
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    maxRetries: 2,
    retryDelayMs: 1,
    fetchImpl: async () => {
      callCount++
      if (callCount < 3) {
        throw new Error("ECONNRESET")
      }
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: null,
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
        }),
        { status: 200 },
      )
    },
  })

  const payment = await client.payments.get("01ABC")
  assert.equal(callCount, 3)
  assert.equal(payment.paymentId, "01ABC")
})

test("provider credential headers are sent on create()", async () => {
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    providers: {
      paymob: {
        secretKey: "pm-secret",
        publicKey: "pm-pub",
        hmacSecret: "pm-hmac",
        integrationId: "99",
        baseUrl: "https://paymob.test",
      },
      fawry: { merchantCode: "MC", secureKey: "fw-key", baseUrl: "https://fawry.test" },
      stripe: { secretKey: "sk_test_123" },
    },
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: "ref",
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
        }),
        { status: 200 },
      )
    }),
  })

  await client.payments.create(
    { provider: "paymob", amountMinorUnits: 1000, currency: "EGP", customer: { phone: "+2010" } },
    { idempotencyKey: "k1" },
  )

  assert.equal(capturedHeaders?.["X-Paymob-Secret-Key"], "pm-secret")
  assert.equal(capturedHeaders?.["X-Paymob-Base-Url"], "https://paymob.test")
  assert.equal(capturedHeaders?.["X-Fawry-Merchant-Code"], "MC")
  assert.equal(capturedHeaders?.["X-Stripe-Secret-Key"], "sk_test_123")
})

test("an already-versioned base URL is not duplicated and payment IDs are path-encoded", async () => {
  let capturedUrl
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test/api/v1/",
    fetchImpl: fakeFetch((url) => {
      capturedUrl = url
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: null,
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
        }),
      )
    }),
  })

  await client.payments.get("part/other")
  assert.equal(capturedUrl, "https://gateway.test/api/v1/payments/part%2Fother")
})

test("per-call provider credentials merge field-by-field", async () => {
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    providers: { paymob: { secretKey: "default-secret", publicKey: "default-public" } },
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers
      return new Response(
        JSON.stringify({
          payment_id: "01ABC",
          provider: "paymob",
          provider_reference: null,
          status: "pending",
          amount_minor_units: 1000,
          currency: "EGP",
          merchant_reference: null,
        }),
      )
    }),
  })

  await client.payments.create(
    { provider: "paymob", amountMinorUnits: 1000, currency: "EGP", customer: { phone: "+2010" } },
    { providers: { paymob: { publicKey: "override-public" } } },
  )
  assert.equal(capturedHeaders["X-Paymob-Secret-Key"], "default-secret")
  assert.equal(capturedHeaders["X-Paymob-Public-Key"], "override-public")
})

test("invalid amounts and idempotency keys fail before sending", async () => {
  let calls = 0
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: async () => {
      calls++
      throw new Error("should not send")
    },
  })
  const params = {
    provider: "paymob",
    amountMinorUnits: 0,
    currency: "EGP",
    customer: { phone: "+2010" },
  }

  await assert.rejects(() => client.payments.create(params), RangeError)
  await assert.rejects(
    () =>
      client.payments.create({ ...params, amountMinorUnits: 1 }, { idempotencyKey: "has space" }),
    TypeError,
  )
  assert.equal(calls, 0)
})

test("proxy validation codes map to ValidationError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(
          JSON.stringify({
            error: { code: "missing_provider_credentials", message: "credentials required" },
          }),
          { status: 422 },
        ),
    ),
  })

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof ValidationError && err.httpStatus === 422,
  )
})

test("client-side deadlines throw GatewayTimeoutError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    timeoutMs: 5,
    fetchImpl: (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        )
      }),
  })

  await assert.rejects(() => client.payments.get("01ABC"), GatewayTimeoutError)
})

test("caller cancellation is propagated without retry", async () => {
  let calls = 0
  const controller = new AbortController()
  const reason = new Error("caller cancelled")
  controller.abort(reason)
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    maxRetries: 2,
    fetchImpl: async () => {
      calls++
      throw new Error("should not send")
    },
  })

  await assert.rejects(() => client.payments.get("01ABC", { signal: controller.signal }), reason)
  assert.equal(calls, 0)
})

test("refunds: create and list call correct endpoints and parse types", async () => {
  let createdBody
  let capturedHeaders
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((url, init) => {
      capturedHeaders = init.headers
      if (url.endsWith("/v1/payments/pay_1/refunds") && init.method === "POST") {
        createdBody = JSON.parse(init.body)
        return new Response(
          JSON.stringify({
            id: "ref_1",
            payment_id: "pay_1",
            amount_minor_units: 500,
            currency: "EGP",
            status: "succeeded",
            reason: "requested_by_customer",
            created_at: 1725616800,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/v1/payments/pay_1/refunds") && init.method === "GET") {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "ref_1",
                payment_id: "pay_1",
                amount_minor_units: 500,
                currency: "EGP",
                status: "succeeded",
                reason: "requested_by_customer",
                created_at: 1725616800,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("not found", { status: 404 })
    }),
  })

  const refund = await client.refunds.create(
    "pay_1",
    { amountMinorUnits: 500, reason: "requested_by_customer" },
    { idempotencyKey: "ref-idemp-1" },
  )
  assert.equal(capturedHeaders?.["Idempotency-Key"], "ref-idemp-1")
  assert.equal(createdBody.amount_minor_units, 500)
  assert.equal(createdBody.reason, "requested_by_customer")
  assert.equal(refund.id, "ref_1")
  assert.equal(refund.paymentId, "pay_1")
  assert.equal(refund.amountMinorUnits, 500)
  assert.equal(refund.status, "succeeded")

  const list = await client.refunds.list("pay_1")
  assert.equal(list.length, 1)
  assert.equal(list[0].id, "ref_1")
})

test("events: list and get call correct endpoints", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((url, _init) => {
      if (url.includes("/v1/events?limit=10&starting_after=evt_0")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "evt_1",
                event_type: "payment.created",
                resource_id: "pay_1",
                payload: { payment_id: "pay_1" },
                created_at: 1725616800,
              },
            ],
            has_more: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/v1/events/evt_1")) {
        return new Response(
          JSON.stringify({
            id: "evt_1",
            event_type: "payment.created",
            resource_id: "pay_1",
            payload: { payment_id: "pay_1" },
            created_at: 1725616800,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("not found", { status: 404 })
    }),
  })

  const env = await client.events.list({ limit: 10, startingAfter: "evt_0" })
  assert.equal(env.data.length, 1)
  assert.equal(env.data[0].id, "evt_1")
  assert.equal(env.data[0].eventType, "payment.created")
  assert.equal(env.data[0].resourceId, "pay_1")
  assert.equal(env.hasMore, false)

  const evt = await client.events.get("evt_1")
  assert.equal(evt.id, "evt_1")
  assert.equal(evt.eventType, "payment.created")
  assert.equal(evt.resourceId, "pay_1")
})

test("webhookEndpoints: create, list, delete", async () => {
  let deletedId
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((url, init) => {
      if (url.endsWith("/v1/webhook_endpoints") && init.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "we_1",
            url: "https://example.com/webhook",
            events: ["payment.created", "payment.refunded"],
            secret: "whsec_test123",
            created_at: "2026-09-06T10:00:00Z",
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/v1/webhook_endpoints") && init.method === "GET") {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "we_1",
                url: "https://example.com/webhook",
                events: ["payment.created"],
                secret: "whsec_test123",
                created_at: "2026-09-06T10:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/v1/webhook_endpoints/we_1") && init.method === "DELETE") {
        deletedId = "we_1"
        return new Response(null, { status: 204 })
      }
      return new Response("not found", { status: 404 })
    }),
  })

  const ep = await client.webhookEndpoints.create({
    url: "https://example.com/webhook",
    events: ["payment.created", "payment.refunded"],
  })
  assert.equal(ep.id, "we_1")
  assert.equal(ep.secret, "whsec_test123")

  const eps = await client.webhookEndpoints.list()
  assert.equal(eps.length, 1)

  await client.webhookEndpoints.delete("we_1")
  assert.equal(deletedId, "we_1")
})

test("webhooks: computeSignature and verifySignature verify valid signatures and reject invalid", () => {
  const secret = "whsec_test_secret_abc123"
  const payload = '{"id":"evt_1","type":"payment.succeeded"}'
  const now = Math.floor(Date.now() / 1000)

  const sig = webhooks.computeSignature(payload, secret, now)
  const header = `t=${now},v1=${sig}`

  const valid = webhooks.verifySignature(payload, header, secret, 300)
  assert.equal(valid, true, "valid signature must verify")

  const wrongSecret = webhooks.verifySignature(payload, header, "wrong_secret", 300)
  assert.equal(wrongSecret, false, "wrong secret must fail verification")

  const expired = webhooks.verifySignature(payload, `t=${now - 400},v1=${sig}`, secret, 300)
  assert.equal(expired, false, "expired timestamp must fail verification")
})

test("ergonomics: default constructor uses local defaults and shortcuts work", async () => {
  const defaultClient = new OpenWrapperClient()
  assert.ok(defaultClient, "default client should construct with 0 arguments")

  let capturedRefundBody
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((url, init) => {
      if (init.method === "POST" && url.endsWith("/refunds")) {
        capturedRefundBody = JSON.parse(init.body)
        return new Response(
          JSON.stringify({
            id: "ref_num",
            payment_id: "pay_1",
            amount_minor_units: 750,
            currency: "EGP",
            status: "succeeded",
            created_at: 1725616800,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
    }),
  })

  // Numeric amount shortcut
  const refund = await client.createRefund("pay_1", 750)
  assert.equal(capturedRefundBody.amount_minor_units, 750)
  assert.equal(refund.id, "ref_num")
  assert.equal(refund.amountMinorUnits, 750)
})

test("currency utilities: toMinorUnits and formatMajorUnits are exact with zero floating point drift", () => {
  assert.equal(toMinorUnits(10.5, 2), 1050)
  assert.equal(toMinorUnits("10.50", 2), 1050)
  assert.equal(toMinorUnits(-10.5, 2), -1050)
  assert.equal(toMinorUnits("-10.50", 2), -1050)
  assert.equal(toMinorUnits("-0.50", 2), -50)
  assert.equal(toMinorUnits(0.01, 2), 1)
  assert.equal(toMinorUnits(150, 0), 150)
  assert.equal(toMinorUnits(1.234, 3), 1234)

  assert.equal(formatMajorUnits(1050, 2), "10.50")
  assert.equal(formatMajorUnits(-1050, 2), "-10.50")
  assert.equal(formatMajorUnits(-50, 2), "-0.50")
  assert.equal(formatMajorUnits(1, 2), "0.01")
  assert.equal(formatMajorUnits(0, 2), "0.00")
  assert.equal(formatMajorUnits(150, 0), "150")
  assert.equal(formatMajorUnits(1234, 3), "1.234")
})
