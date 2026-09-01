import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const db = postgres("postgres");

  const valkey = service("valkey", {
    image: "valkey/valkey:8-alpine",
    healthcheck: "/",
    healthcheckTimeout: 30,
  });

  const rabbitmq = service("rabbitmq", {
    image: "rabbitmq:3.13-management-alpine",
    healthcheck: "/",
    healthcheckTimeout: 30,
    env: {
      RABBITMQ_DEFAULT_USER: preserve(),
      RABBITMQ_DEFAULT_PASS: preserve(),
      RABBITMQ_DEFAULT_VHOST: "openwrapper",
    },
  });

  const gateway = service("gateway", {
    source: github("MoustafaAt1a/openwrapper", { branch: "main" }),
    healthcheck: "/v1/ready",
    healthcheckTimeout: 30,
    env: {
      PORT: "8080",
      OPENWRAPPER_BIND_ADDR: "0.0.0.0:8080",
      OPENWRAPPER_DATABASE_URL: db.env.DATABASE_URL,
      OPENWRAPPER_CACHE_URL: "redis://valkey.railway.internal:6379",
      OPENWRAPPER_AMQP_URL: preserve(),
      OPENWRAPPER_API_KEYS: preserve(),
      OPENWRAPPER_LOG_FORMAT: "json",
      OPENWRAPPER_RATE_LIMIT_PER_SEC: "100",
      OPENWRAPPER_RECONCILIATION_INTERVAL_SECS: "60",
      OPENWRAPPER_ENABLE_PAYMOB: preserve(),
      PAYMOB_SECRET_KEY: preserve(),
      PAYMOB_HMAC_SECRET: preserve(),
      PAYMOB_PUBLIC_KEY: preserve(),
      PAYMOB_INTEGRATION_IDS: preserve(),
      PAYMOB_NOTIFICATION_URL: preserve(),
      OPENWRAPPER_ENABLE_FAWRY: preserve(),
      FAWRY_MERCHANT_CODE: preserve(),
      FAWRY_SECURE_KEY: preserve(),
      FAWRY_BASE_URL: preserve(),
    },
  });

  const web = service("web", {
    source: github("MoustafaAt1a/openwrapper", {
      branch: "main",
      rootDirectory: "web",
    }),
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 30,
    env: {
      PORT: "3000",
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL,
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
      OPENWRAPPER_GATEWAY_URL: "http://gateway.railway.internal:8080",
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
    },
  });

  return project("openwrapper", {
    resources: [db, valkey, rabbitmq, gateway, web],
  });
});
