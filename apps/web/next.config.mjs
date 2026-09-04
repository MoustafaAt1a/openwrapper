import crypto from "node:crypto"

if (!process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
  const seed = process.env.BETTER_AUTH_SECRET || "openwrapper-lts-v0.1.3-encryption-seed"
  process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = crypto
    .createHash("sha256")
    .update(`openwrapper-server-actions:${seed}`)
    .digest("hex")
}

const allowedServerActionOrigins = Array.from(
  new Set(
    [
      "openwrapper.muejam.com",
      "gateway.openwrapper.muejam.com",
      "*.openwrapper.muejam.com",
      "*.muejam.com",
      "localhost:3000",
      "127.0.0.1:3000",
      process.env.WEB_DOMAIN,
      process.env.GATEWAY_DOMAIN,
      process.env.CLOUDFLARE_DOMAIN,
      process.env.NEXT_PUBLIC_APP_URL
        ? new URL(
            process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
              ? process.env.NEXT_PUBLIC_APP_URL
              : `https://${process.env.NEXT_PUBLIC_APP_URL}`,
          ).host
        : undefined,
    ].filter(Boolean),
  ),
)

/** @type {import('next').NextConfig} */
const productionSecurityHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; base-uri 'self'; connect-src 'self' https://openwrapper.muejam.com https://gateway.openwrapper.muejam.com https://*.vercel-insights.com; font-src 'self' data:; form-action 'self' https://openwrapper.muejam.com; frame-ancestors 'self'; img-src 'self' data: blob:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
      ]
    : []

const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  logging: {
    fetches: { fullUrl: false, hmrRefreshes: false },
  },
  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key",
          },
          { key: "Access-Control-Expose-Headers", value: "Idempotency-Key" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key",
          },
          { key: "Access-Control-Expose-Headers", value: "Idempotency-Key" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=()" },
          ...productionSecurityHeaders,
        ],
      },
    ]
  },
}

export default nextConfig
