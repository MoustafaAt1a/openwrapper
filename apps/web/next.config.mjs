import crypto from "node:crypto"

if (!process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
  const seed = process.env.BETTER_AUTH_SECRET || "openwrapper-lts-v0.2.0-encryption-seed"
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
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {},
  images: { unoptimized: true },
  logging: {
    fetches: { fullUrl: false, hmrRefreshes: false },
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "motion",
      "motion/react",
      "prismjs",
      "@base-ui/react",
      "clsx",
      "tailwind-merge",
      "sonner",
      "zod",
    ],
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },
  webpack(config, { isServer, dev }) {
    if (!isServer && !dev) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = {
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: "framework",
            chunks: "all",
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          motion: {
            name: "motion",
            test: /[\\/]node_modules[\\/](motion|framer-motion)[\\/]/,
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          charts: {
            name: "charts",
            test: /[\\/]node_modules[\\/](recharts|d3-[a-z0-9-]+)[\\/]/,
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          syntax: {
            name: "syntax",
            test: /[\\/]node_modules[\\/](prismjs)[\\/]/,
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          icons: {
            name: "icons",
            test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
            chunks: "all",
            priority: 25,
            reuseExistingChunk: true,
          },
          lib: {
            test(module) {
              return (
                typeof module.size === "function" &&
                module.size() > 140000 &&
                /node_modules[/\\]/.test(module.identifier())
              )
            },
            name(module) {
              const hash = crypto.createHash("sha1")
              hash.update(module.identifier())
              return `lib-${hash.digest("hex").slice(0, 8)}`
            },
            priority: 20,
            minChunks: 1,
            reuseExistingChunk: true,
            chunks: "all",
          },
          commons: {
            name: "commons",
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            chunks: "all",
          },
        },
      }
    }
    return config
  },
  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/sign-up",
        destination: "/register",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/:version(v[0-9]+)/:path*",
        destination: "/api/:version/:path*",
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/assets/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/(site\\.webmanifest|favicon\\.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key, X-OpenWrapper-Signature, x-openwrapper-signature, X-OpenWrapper-Webhook-Secret, X-Mock-Decline, X-Mock-Timeout, X-Mock-Pending",
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
              "Content-Type, Authorization, X-API-Key, Idempotency-Key, stripe-signature, x-paymob-hmac, X-Paymob-Secret-Key, X-Paymob-Public-Key, X-Paymob-Hmac-Secret, X-Paymob-Integration-Id, X-Fawry-Merchant-Code, X-Fawry-Secure-Key, X-Fawry-Base-Url, X-Stripe-Secret-Key, X-OpenWrapper-Signature, x-openwrapper-signature, X-OpenWrapper-Webhook-Secret, X-Mock-Decline, X-Mock-Timeout, X-Mock-Pending",
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
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), payment=()",
          },
          ...productionSecurityHeaders,
        ],
      },
    ]
  },
}

export default nextConfig
