import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenWrapperClient, ValidationError, RateLimitError, GatewayUnreachableError } from "../dist/index.js";

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    return handler(String(input), init ?? {});
  }) as typeof fetch;
}

test("create() sends an Idempotency-Key header even when the caller doesn't supply one", async () => {
  let capturedHeaders: Record<string, string> | undefined;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
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
  let capturedHeaders: Record<string, string> | undefined;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
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
        amountMinorUnits: -1,
        currency: "EGP",
        customer: { phone: "1" },
      }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.equal((err as ValidationError).message, "invalid amount");
      assert.equal((err as ValidationError).httpStatus, 400);
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
    (err: unknown) => err instanceof RateLimitError
  );
});

test("a network failure reaching the gateway itself throws GatewayUnreachableError", async () => {
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    fetchImpl: (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch,
  });

  await assert.rejects(
    () => client.payments.get("01ABC"),
    (err: unknown) => err instanceof GatewayUnreachableError
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
  let capturedHeaders: Record<string, string> | undefined;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    apiKey: "test-secret-key-123",
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
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
    }) as typeof fetch,
  });

  const payment = await client.payments.get("01ABC");
  assert.equal(callCount, 3);
  assert.equal(payment.paymentId, "01ABC");
});

test("provider credential headers are sent on create()", async () => {
  let capturedHeaders: Record<string, string> | undefined;
  const client = new OpenWrapperClient({
    baseUrl: "https://gateway.test",
    providers: {
      paymob: { secretKey: "pm-secret", publicKey: "pm-pub", hmacSecret: "pm-hmac", integrationId: "99" },
      fawry: { merchantCode: "MC", secureKey: "fw-key", baseUrl: "https://fawry.test" },
      stripe: { secretKey: "sk_test_123" },
    },
    fetchImpl: fakeFetch((_url, init) => {
      capturedHeaders = init.headers as Record<string, string>;
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
  assert.equal(capturedHeaders?.["X-Fawry-Merchant-Code"], "MC");
  assert.equal(capturedHeaders?.["X-Stripe-Secret-Key"], "sk_test_123");
});

