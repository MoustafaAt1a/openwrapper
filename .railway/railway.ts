import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const db = postgres("postgres");

  const gateway = service("gateway", {
    source: github("MoustafaAt1a/openwrapper", { branch: "main" }),
    healthcheck: "/v1/health",
    healthcheckTimeout: 30,
    env: {
      OPENWRAPPER_BIND_ADDR: "0.0.0.0:8080",
      OPENWRAPPER_DATABASE_URL: db.env.DATABASE_URL,
      OPENWRAPPER_API_KEYS: preserve(),
      OPENWRAPPER_LOG_FORMAT: "json",
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
    healthcheck: "/",
    healthcheckTimeout: 30,
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
      OPENWRAPPER_GATEWAY_URL: "http://gateway.railway.internal:8080",
      PAYMOB_SECRET_KEY: preserve(),
      PAYMOB_HMAC_SECRET: preserve(),
      PAYMOB_PUBLIC_KEY: preserve(),
      PAYMOB_INTEGRATION_IDS: preserve(),
      PAYMOB_NOTIFICATION_URL: preserve(),
      FAWRY_MERCHANT_CODE: preserve(),
      FAWRY_SECURE_KEY: preserve(),
      FAWRY_BASE_URL: preserve(),
      STRIPE_SECRET_KEY: preserve(),
      STRIPE_WEBHOOK_SECRET: preserve(),
    },
  });

  return project("openwrapper", {
    resources: [db, gateway, web],
  });
});
