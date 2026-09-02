import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OpenWrapperClient,
  ValidationError,
  RateLimitError,
  GatewayTimeoutError,
  GatewayUnreachableError,
} from "../dist/index.js";

function fakeFetch(handler) {
  return async (input, init) => handler(String(input), init ?? {});
}

test("create() sends an Idempotency-Key header even when the caller doesn't supply one", async () => {
  let capturedHeaders;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers;
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
        { status: 201, headers: { "content-type": "application/json" } }
      );
    }),
  });

  const payment = await client.payments.create({
    provider: "paymob",
    amountMinorUnits: 1000,
    currency: "EGP",
    customer: { phone: "+201234567890" },
  });

  assert.ok(capturedHeaders?.["Idempotency-Key"], "an Idempotency-Key header must always be sent");
  assert.equal(payment.paymentId, "01ABC");
  assert.equal(payment.status, "pending");
  assert.deepEqual(payment.nextAction, { type: "redirect_to_url", url: "https://accept.paymob.com/..." });
});

test("caller-supplied idempotency key is passed through unchanged", async () => {
  let capturedHeaders;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers;
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
        { status: 201 }
      );
    }),
  });

  await client.payments.create(
    { provider: "fawry", amountMinorUnits: 500, currency: "EGP", customer: { phone: "+2010" } },
    { idempotencyKey: "order-7" }
  );

  assert.equal(capturedHeaders?.["Idempotency-Key"], "order-7");
});

test("a 400 validation response is thrown as ValidationError with the server's message", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(JSON.stringify({ error: { code: "validation_error", message: "invalid amount" } }), {
          status: 400,
        })
    ),
  });

  await assert.rejects(
    () =>
      client.payments.create({
        provider: "paymob",
        amountMinorUnits: 1,
        currency: "EGP",
        customer: { phone: "1" },
      }),
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.message, "invalid amount");
      assert.equal(err.httpStatus, 400);
      return true;
    }
  );
});

test("a 429 response is thrown as RateLimitError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(
      () =>
        new Response(JSON.stringify({ error: { code: "rate_limit", message: "slow down" } }), { status: 429 })
    ),
  });

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof RateLimitError
  );
});

test("a network failure reaching the gateway itself throws GatewayUnreachableError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof GatewayUnreachableError
  );
});

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
          { status: 200 }
        )
    ),
  });

  const payment = await client.payments.get("01ABC");
  assert.equal(payment.status, "unknown");
});

test("apiKey option is propagated as X-API-Key header in requests", async () => {
  let capturedHeaders;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    apiKey: "test-secret-key-123",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers;
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
        { status: 200 }
      );
    }),
  });

  await client.payments.get("01ABC");
  assert.equal(capturedHeaders?.["X-API-Key"], "test-secret-key-123");
});

test("client retries transient network errors up to maxRetries", async () => {
  let callCount = 0;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    maxRetries: 2,
    retryDelayMs: 1,
    fetchImpl: (async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("ECONNRESET");
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
        { status: 200 }
      );
    },
  });

  const payment = await client.payments.get("01ABC");
  assert.equal(callCount, 3);
  assert.equal(payment.paymentId, "01ABC");
});

test("provider credential headers are sent on create()", async () => {
  let capturedHeaders;
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
      capturedHeaders = init.headers;
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
        { status: 200 }
      );
    }),
  });

  await client.payments.create(
    { provider: "paymob", amountMinorUnits: 1000, currency: "EGP", customer: { phone: "+2010" } },
    { idempotencyKey: "k1" }
  );

  assert.equal(capturedHeaders?.["X-Paymob-Secret-Key"], "pm-secret");
  assert.equal(capturedHeaders?.["X-Paymob-Base-Url"], "https://paymob.test");
  assert.equal(capturedHeaders?.["X-Fawry-Merchant-Code"], "MC");
  assert.equal(capturedHeaders?.["X-Stripe-Secret-Key"], "sk_test_123");
});

test("an already-versioned base URL is not duplicated and payment IDs are path-encoded", async () => {
  let capturedUrl;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test/api/v1/",
    fetchImpl: fakeFetch((url) => {
      capturedUrl = url;
      return new Response(JSON.stringify({
        payment_id: "01ABC",
        provider: "paymob",
        provider_reference: null,
        status: "pending",
        amount_minor_units: 1000,
        currency: "EGP",
        merchant_reference: null,
      }));
    }),
  });

  await client.payments.get("part/other");
  assert.equal(capturedUrl, "https://gateway.test/api/v1/payments/part%2Fother");
});

test("per-call provider credentials merge field-by-field", async () => {
  let capturedHeaders;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    providers: { paymob: { secretKey: "default-secret", publicKey: "default-public" } },
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers;
      return new Response(JSON.stringify({
        payment_id: "01ABC",
        provider: "paymob",
        provider_reference: null,
        status: "pending",
        amount_minor_units: 1000,
        currency: "EGP",
        merchant_reference: null,
      }));
    }),
  });

  await client.payments.create(
    { provider: "paymob", amountMinorUnits: 1000, currency: "EGP", customer: { phone: "+2010" } },
    { providers: { paymob: { publicKey: "override-public" } } }
  );
  assert.equal(capturedHeaders["X-Paymob-Secret-Key"], "default-secret");
  assert.equal(capturedHeaders["X-Paymob-Public-Key"], "override-public");
});

test("invalid amounts and idempotency keys fail before sending", async () => {
  let calls = 0;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: async () => {
      calls++;
      throw new Error("should not send");
    },
  });
  const params = { provider: "paymob", amountMinorUnits: 0, currency: "EGP", customer: { phone: "+2010" } };

  await assert.rejects(() => client.payments.create(params), RangeError);
  await assert.rejects(
    () => client.payments.create({ ...params, amountMinorUnits: 1 }, { idempotencyKey: "has space" }),
    TypeError
  );
  assert.equal(calls, 0);
});

test("proxy validation codes map to ValidationError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch(() => new Response(
      JSON.stringify({ error: { code: "missing_provider_credentials", message: "credentials required" } }),
      { status: 422 }
    )),
  });

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err) => err instanceof ValidationError && err.httpStatus === 422
  );
});

test("client-side deadlines throw GatewayTimeoutError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    timeoutMs: 5,
    fetchImpl: (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
  });

  await assert.rejects(() => client.payments.get("01ABC"), GatewayTimeoutError);
});

test("caller cancellation is propagated without retry", async () => {
  let calls = 0;
  const controller = new AbortController();
  const reason = new Error("caller cancelled");
  controller.abort(reason);
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    maxRetries: 2,
    fetchImpl: async () => {
      calls++;
      throw new Error("should not send");
    },
  });

  await assert.rejects(() => client.payments.get("01ABC", { signal: controller.signal }), reason);
  assert.equal(calls, 0);
});

