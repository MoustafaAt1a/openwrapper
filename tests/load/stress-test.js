import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentLatency = new Trend('payment_duration_ms');
const idempotentReplays = new Counter('idempotent_replays');
const healthLatency = new Trend('health_duration_ms');
const webhookLatency = new Trend('webhook_duration_ms');
const authRejectionRate = new Rate('auth_rejection_rate');
const webhookGracefulRate = new Rate('webhook_graceful_rate');

const BASE_URL = __ENV.TARGET_URL;
if (!BASE_URL) {
  throw new Error('TARGET_URL is required (e.g. http://localhost:8080)');
}
const API_KEY = __ENV.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY is required (e.g. export API_KEY=ow_live_...)');
}

function buildPaymentProfiles() {
  const profiles = [];

  if (__ENV.FAWRY_MERCHANT_CODE && __ENV.FAWRY_SECURE_KEY) {
    profiles.push({
      provider: 'fawry',
      currency: 'EGP',
      extraHeaders: {
        'X-Fawry-Merchant-Code': __ENV.FAWRY_MERCHANT_CODE,
        'X-Fawry-Secure-Key': __ENV.FAWRY_SECURE_KEY,
        'X-Fawry-Base-Url': __ENV.FAWRY_BASE_URL || 'https://atfawry.fawrystaging.com',
      },
    });
  }

  if (
    __ENV.PAYMOB_SECRET_KEY &&
    __ENV.PAYMOB_PUBLIC_KEY &&
    __ENV.PAYMOB_HMAC_SECRET &&
    __ENV.PAYMOB_INTEGRATION_ID
  ) {
    const paymobHeaders = {
      'X-Paymob-Secret-Key': __ENV.PAYMOB_SECRET_KEY,
      'X-Paymob-Public-Key': __ENV.PAYMOB_PUBLIC_KEY,
      'X-Paymob-Hmac-Secret': __ENV.PAYMOB_HMAC_SECRET,
      'X-Paymob-Integration-Id': __ENV.PAYMOB_INTEGRATION_ID,
    };
    if (__ENV.PAYMOB_BASE_URL) {
      paymobHeaders['X-Paymob-Base-Url'] = __ENV.PAYMOB_BASE_URL;
    }
    profiles.push({
      provider: 'paymob',
      currency: 'EGP',
      extraHeaders: paymobHeaders,
    });
  }

  if (__ENV.STRIPE_SECRET_KEY) {
    profiles.push({
      provider: 'stripe',
      currency: 'USD',
      extraHeaders: { 'X-Stripe-Secret-Key': __ENV.STRIPE_SECRET_KEY },
      returnUrl: 'https://example.com/payment/success',
    });
  }

  return profiles;
}

const PAYMENT_PROFILES = buildPaymentProfiles();

// Fawry staging is slow under concurrency; tune via env for local vs Railway.
const PAYMENT_P99_MS = Number(__ENV.PAYMENT_P99_MS || 20000);
const PAYMENT_STRESS_MAX_VUS = Number(__ENV.PAYMENT_STRESS_MAX_VUS || 25);
const PAYMENT_SUCCESS_MIN = Number(__ENV.PAYMENT_SUCCESS_MIN || 0.75);

export const options = {
  scenarios: {
    // ── Phase 1: Health Probe Sustained Load ──────────────────────
    health_probe: {
      executor: 'constant-vus',
      vus: 15,
      duration: '20s',
      exec: 'testHealth',
      tags: { path: 'success' },
    },
    // ── Phase 2: Payment Stress Ramp (0 → N VUs) ─────────────────
    payment_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: Math.ceil(PAYMENT_STRESS_MAX_VUS / 2) },
        { duration: '20s', target: PAYMENT_STRESS_MAX_VUS },
        { duration: '10s', target: PAYMENT_STRESS_MAX_VUS },
        { duration: '5s', target: 0 },
      ],
      exec: 'testPayments',
      startTime: '5s',
      tags: { path: 'success' },
    },
    // ── Phase 3: Webhook Flood (forged signatures — expect 4xx, not 5xx) ─
    webhook_flood: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
      exec: 'testWebhooks',
      startTime: '10s',
      tags: { path: 'security' },
    },
    // ── Phase 4: Auth rejection (expect 401 — covered in security-test.mjs) ─
    auth_bruteforce: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10s',
      exec: 'testAuthRejection',
      startTime: '15s',
      tags: { path: 'security' },
    },
  },
  thresholds: {
    // Success-path only — ignore intentional 4xx from security scenarios.
    'http_req_failed{path:success}': ['rate<0.15'],
    'http_req_duration{name:HealthCheck}': ['p(99)<1500'],
    'http_req_duration{name:CreatePayment}': [`p(99)<${PAYMENT_P99_MS}`],
    health_duration_ms: ['p(99)<1500'],
    payment_duration_ms: [`p(99)<${PAYMENT_P99_MS}`],
    webhook_duration_ms: ['p(99)<1000'],
    payment_success_rate: [`rate>${PAYMENT_SUCCESS_MIN}`],
    auth_rejection_rate: ['rate>0.99'],
    webhook_graceful_rate: ['rate>0.99'],
    checks: ['rate>0.95'],
  },
};

// ─── Scenario 1: Health Endpoint ───────────────────────────────────
export function testHealth() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { name: 'HealthCheck', path: 'success' },
  });
  healthLatency.add(Date.now() - start);

  check(res, {
    'health: status 200': (r) => r.status === 200,
    'health: body is healthy': (r) => {
      try {
        const status = JSON.parse(r.body).status;
        return status === 'healthy' || status === 'ok';
      } catch { return false; }
    },
  });

  sleep(0.15);
}

// ─── Scenario 2: Payment Creation Stress ───────────────────────────
export function testPayments() {
  const profile = PAYMENT_PROFILES[__ITER % PAYMENT_PROFILES.length];
  const uniqueRef = `k6_${profile.provider}_${__VU}_${__ITER}_${Date.now()}`;
  const idempotencyKey = `k6-pay-${profile.provider}-${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    provider: profile.provider,
    amount_minor_units: 10000 + (__ITER % 50) * 100,
    currency: profile.currency,
    customer: {
      phone: `+20100${String(__VU).padStart(4, '0')}${String(__ITER % 100).padStart(3, '0')}`,
      email: `vu${__VU}@stress.internal`,
      full_name: `Stress VU ${__VU}`,
    },
    merchant_reference: uniqueRef,
    description: `k6 ${profile.provider} stress test`,
    ...(profile.returnUrl ? { return_url: profile.returnUrl } : {}),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Idempotency-Key': idempotencyKey,
      ...profile.extraHeaders,
    },
    tags: { name: 'CreatePayment', path: 'success', provider: profile.provider },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/payments`, payload, params);
  paymentLatency.add(Date.now() - start);

  const isSuccess = check(res, {
    'payment: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'payment: has payment_id': (r) => {
      try { return Boolean(JSON.parse(r.body).payment_id); } catch { return false; }
    },
  });

  paymentSuccessRate.add(isSuccess);
  if (res.status === 200) idempotentReplays.add(1);

  sleep(0.2);
}

// ─── Scenario 3: Webhook Flood (Forged Signatures) ─────────────────
export function testWebhooks() {
  const start0 = Date.now();
  const paymobRes = http.post(
    `${BASE_URL}/api/v1/webhooks/paymob`,
    JSON.stringify({
      type: 'TRANSACTION',
      obj: {
        id: 100000 + __ITER,
        success: true,
        amount_cents: 10000,
        currency: 'EGP',
        order: { merchant_order_id: `ord_flood_${__VU}_${__ITER}` },
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-paymob-hmac': `forged_flood_hmac_${__ITER}`,
      },
      tags: { name: 'WebhookPaymobForged', path: 'security' },
    }
  );
  webhookLatency.add(Date.now() - start0);

  const paymobOk = check(paymobRes, {
    'paymob webhook: handled gracefully': (r) => r.status < 500,
  });
  webhookGracefulRate.add(paymobOk);

  const start1 = Date.now();
  const fawryRes = http.post(
    `${BASE_URL}/api/v1/webhooks/fawry`,
    JSON.stringify({
      fawryRefNumber: `flood_${__VU}_${__ITER}`,
      merchantRefNumber: `ord_flood_${__ITER}`,
      paymentAmount: '100.00',
      orderStatus: 'PAID',
      messageSignature: 'forged_flood_sig_' + __ITER,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'WebhookFawryForged', path: 'security' },
    }
  );
  webhookLatency.add(Date.now() - start1);

  const fawryOk = check(fawryRes, {
    'fawry webhook: handled gracefully': (r) => r.status < 500,
  });
  webhookGracefulRate.add(fawryOk);

  const start2 = Date.now();
  const stripeRes = http.post(
    `${BASE_URL}/api/v1/webhooks/stripe`,
    JSON.stringify({
      id: `evt_flood_${__VU}_${__ITER}`,
      type: 'checkout.session.completed',
      data: { object: { id: `cs_flood_${__ITER}`, payment_status: 'paid' } },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=forged_flood_${__ITER}`,
      },
      tags: { name: 'WebhookStripeForged', path: 'security' },
    }
  );
  webhookLatency.add(Date.now() - start2);

  const stripeOk = check(stripeRes, {
    'stripe webhook: handled gracefully': (r) => r.status < 500,
  });
  webhookGracefulRate.add(stripeOk);

  sleep(0.3);
}

// ─── Scenario 4: Auth Brute Force Rejection ────────────────────────
export function testAuthRejection() {
  const res1 = http.post(
    `${BASE_URL}/api/v1/payments`,
    JSON.stringify({ provider: 'fawry', amount_minor_units: 1000 }),
    {
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `brute-${__VU}-${__ITER}` },
      tags: { name: 'AuthNoHeader', path: 'security' },
    }
  );
  const noAuthOk = check(res1, { 'no-auth: returns 401': (r) => r.status === 401 });
  authRejectionRate.add(noAuthOk);

  const res2 = http.post(
    `${BASE_URL}/api/v1/payments`,
    JSON.stringify({ provider: 'fawry', amount_minor_units: 1000 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ow_live_FAKE_${__VU}_${__ITER}_attacker`,
        'Idempotency-Key': `brute-fake-${__VU}-${__ITER}`,
      },
      tags: { name: 'AuthFakeKey', path: 'security' },
    }
  );
  const fakeKeyOk = check(res2, { 'fake-key: returns 401': (r) => r.status === 401 });
  authRejectionRate.add(fakeKeyOk);

  sleep(0.1);
}
