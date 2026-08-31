import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentLatency = new Trend('payment_duration_ms');
const idempotentReplays = new Counter('idempotent_replays');

const BASE_URL = __ENV.TARGET_URL || 'https://web-production-884cd.up.railway.app';
const API_KEY = __ENV.API_KEY || 'ow_live_uwps019_ivSbnDc7Fz8-vHRIWf5QyFGr';

export const options = {
  scenarios: {
    // 1. Health Probe Load Test
    health_probe: {
      executor: 'constant-vus',
      vus: 10,
      duration: '15s',
      exec: 'testHealth',
    },
    // 2. High-Concurrency Stress Test on Payments & Idempotency
    payment_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 }, // Ramp up to 20 VUs
        { duration: '20s', target: 40 }, // Peak stress at 40 concurrent VUs
        { duration: '5s', target: 0 },   // Cool down
      ],
      exec: 'testPayments',
      startTime: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Less than 5% total failure rate under stress
    http_req_duration: ['p(95)<1500'], // 95% of requests should complete under 1.5s
    payment_success_rate: ['rate>0.95'],
  },
};

export function testHealth() {
  const res = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { name: 'HealthCheck' },
  });

  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health returns healthy': (r) => {
      try {
        return JSON.parse(r.body).status === 'healthy';
      } catch {
        return false;
      }
    },
  });

  sleep(0.2);
}

export function testPayments() {
  // Use a deterministic key per VU to test idempotency and database concurrency
  const idempotencyKey = `k6-stress-vu-${__VU}-${Math.floor(__ITER / 3)}`;
  const payload = JSON.stringify({
    provider: 'fawry',
    amount_minor_units: 15000,
    currency: 'EGP',
    customer: {
      phone: `+20100${String(__VU).padStart(4, '0')}${String(__ITER % 100).padStart(3, '0')}`,
      email: `vu_${__VU}@stress-test.internal`,
      full_name: `Stress VU ${__VU}`,
    },
    merchant_reference: `k6_order_${__VU}_${__ITER}`,
    description: 'k6 Automated Stress Test Intention',
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
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has payment_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Boolean(body.payment_id);
      } catch {
        return false;
      }
    },
  });

  paymentSuccessRate.add(isSuccess);

  // If this was an idempotency replay (status 200 instead of 201), increment metric
  if (res.status === 200) {
    idempotentReplays.add(1);
  }

  sleep(0.3);
}
