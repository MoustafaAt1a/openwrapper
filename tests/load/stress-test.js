import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentLatency = new Trend('payment_duration_ms');
const idempotentReplays = new Counter('idempotent_replays');
const healthLatency = new Trend('health_duration_ms');
const webhookLatency = new Trend('webhook_duration_ms');

const BASE_URL = __ENV.TARGET_URL || 'https://web-production-884cd.up.railway.app';
const API_KEY = __ENV.API_KEY || 'ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr';

export const options = {
  scenarios: {
    // ── Phase 1: Health Probe Sustained Load ──────────────────────
    health_probe: {
      executor: 'constant-vus',
      vus: 15,
      duration: '20s',
      exec: 'testHealth',
    },
    // ── Phase 2: Payment Stress Ramp (0 → 50 VUs) ────────────────
    payment_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 25 },  // Warm up
        { duration: '20s', target: 50 },  // Peak stress at 50 concurrent VUs
        { duration: '10s', target: 50 },  // Sustain peak
        { duration: '5s', target: 0 },    // Cool down
      ],
      exec: 'testPayments',
      startTime: '5s',
    },
    // ── Phase 3: Webhook Flood (Forged + Valid) ───────────────────
    webhook_flood: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
      exec: 'testWebhooks',
      startTime: '10s',
    },
    // ── Phase 4: Auth Brute Force Rejection ───────────────────────
    auth_bruteforce: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10s',
      exec: 'testAuthRejection',
      startTime: '15s',
    },
  },
  thresholds: {
    // ── P99 Latency Thresholds ────────────────────────────────────
    http_req_duration: ['p(99)<2000'],              // P99 under 2 seconds
    health_duration_ms: ['p(99)<500'],              // Health P99 under 500ms
    payment_duration_ms: ['p(99)<2000'],            // Payment P99 under 2s
    webhook_duration_ms: ['p(99)<1000'],            // Webhook P99 under 1s
    http_req_failed: ['rate<0.10'],                 // Less than 10% total failure
    payment_success_rate: ['rate>0.25'],            // >25% success (Fawry rate-limits)
  },
};

// ─── Scenario 1: Health Endpoint ───────────────────────────────────
export function testHealth() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { name: 'HealthCheck' },
  });
  healthLatency.add(Date.now() - start);

  check(res, {
    'health: status 200': (r) => r.status === 200,
    'health: body is healthy': (r) => {
      try { return JSON.parse(r.body).status === 'healthy'; } catch { return false; }
    },
  });

  sleep(0.15);
}

// ─── Scenario 2: Payment Creation Stress ───────────────────────────
export function testPayments() {
  const uniqueRef = `k6_${__VU}_${__ITER}_${Date.now()}`;
  const idempotencyKey = `k6-idem-${__VU}-${Math.floor(__ITER / 3)}`;
  const payload = JSON.stringify({
    provider: 'fawry',
    amount_minor_units: 10000 + (__ITER % 50) * 100,
    currency: 'EGP',
    customer: {
      phone: `+20100${String(__VU).padStart(4, '0')}${String(__ITER % 100).padStart(3, '0')}`,
      email: `vu${__VU}@stress.internal`,
      full_name: `Stress VU ${__VU}`,
    },
    merchant_reference: uniqueRef,
    description: 'k6 P99 Stress Test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Idempotency-Key': idempotencyKey,
      'X-Fawry-Merchant-Code': '1013970',
      'X-Fawry-Secure-Key': 'd11b3329-c70e-4ab8-9cc0-84cfc79e6024',
    },
    tags: { name: 'CreatePayment' },
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
  // Fawry forged webhook
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
      tags: { name: 'WebhookFawryForged' },
    }
  );
  webhookLatency.add(Date.now() - start1);

  check(fawryRes, {
    'fawry webhook: handled gracefully': (r) => r.status < 500,
  });

  // Stripe forged webhook
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
      tags: { name: 'WebhookStripeForged' },
    }
  );
  webhookLatency.add(Date.now() - start2);

  check(stripeRes, {
    'stripe webhook: handled gracefully': (r) => r.status < 500,
  });

  sleep(0.3);
}

// ─── Scenario 4: Auth Brute Force Rejection ────────────────────────
export function testAuthRejection() {
  // No auth header
  const res1 = http.post(
    `${BASE_URL}/api/v1/payments`,
    JSON.stringify({ provider: 'fawry', amount_minor_units: 1000 }),
    {
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `brute-${__VU}-${__ITER}` },
      tags: { name: 'AuthNoHeader' },
    }
  );
  check(res1, { 'no-auth: returns 401': (r) => r.status === 401 });

  // Fake API key
  const res2 = http.post(
    `${BASE_URL}/api/v1/payments`,
    JSON.stringify({ provider: 'fawry', amount_minor_units: 1000 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ow_live_FAKE_${__VU}_${__ITER}_attacker`,
        'Idempotency-Key': `brute-fake-${__VU}-${__ITER}`,
      },
      tags: { name: 'AuthFakeKey' },
    }
  );
  check(res2, { 'fake-key: returns 401': (r) => r.status === 401 });

  sleep(0.1);
}
