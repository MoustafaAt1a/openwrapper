/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
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
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS, PATCH" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key",
          },
          { key: "Access-Control-Expose-Headers", value: "Idempotency-Key" },
        ],
      },
      {
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS, PATCH" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key",
          },
          { key: "Access-Control-Expose-Headers", value: "Idempotency-Key" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ]
  },
}

export default nextConfig
