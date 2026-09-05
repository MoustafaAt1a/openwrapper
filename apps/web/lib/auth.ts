import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"
import { isNextProductionBuild } from "@/lib/next-build"

function asOrigin(value?: string) {
  if (!value) return undefined
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : undefined
  } catch {
    return undefined
  }
}

function resolveAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (secret && secret.length >= 32) {
    return secret
  }
  if (isNextProductionBuild()) {
    return "build-time-placeholder-auth-secret-not-used-at-runtime"
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_SECRET must be set to a random string of at least 32 characters in production.",
    )
  }
  console.warn(
    "[auth] BETTER_AUTH_SECRET is unset — using development-only fallback. Do not use in production.",
  )
  return "openwrapper-dev-only-auth-secret-not-for-production"
}

const DEFAULT_WEB_ORIGIN = "https://openwrapper.muejam.com"
const DEFAULT_GATEWAY_ORIGIN = "https://gateway.openwrapper.muejam.com"

const baseURL =
  asOrigin(process.env.BETTER_AUTH_URL) ??
  asOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
  asOrigin(process.env.APP_URL) ??
  asOrigin(process.env.RAILWAY_PUBLIC_DOMAIN) ??
  asOrigin(process.env.RAILWAY_STATIC_URL) ??
  asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  asOrigin(process.env.VERCEL_URL) ??
  asOrigin(process.env.V0_RUNTIME_URL) ??
  (process.env.NODE_ENV === "production" ? DEFAULT_WEB_ORIGIN : "http://localhost:3000")

const customTrustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((item) => asOrigin(item.trim()))
  .filter(Boolean) as string[]

const allTrustedOrigins = Array.from(
  new Set(
    [
      DEFAULT_WEB_ORIGIN,
      "http://openwrapper.muejam.com",
      DEFAULT_GATEWAY_ORIGIN,
      "http://gateway.openwrapper.muejam.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      asOrigin(process.env.BETTER_AUTH_URL),
      asOrigin(process.env.NEXT_PUBLIC_APP_URL),
      asOrigin(process.env.APP_URL),
      asOrigin(process.env.WEB_DOMAIN ? `https://${process.env.WEB_DOMAIN}` : undefined),
      asOrigin(process.env.GATEWAY_DOMAIN ? `https://${process.env.GATEWAY_DOMAIN}` : undefined),
      asOrigin(
        process.env.CLOUDFLARE_DOMAIN ? `https://${process.env.CLOUDFLARE_DOMAIN}` : undefined,
      ),
      asOrigin(process.env.RAILWAY_PUBLIC_DOMAIN),
      asOrigin(process.env.RAILWAY_STATIC_URL),
      asOrigin(process.env.VERCEL_URL),
      asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      asOrigin(process.env.V0_RUNTIME_URL),
      asOrigin(process.env.V0_DEV_APP_URL),
      asOrigin(process.env.V0_BUILD_URL),
      asOrigin(process.env.V0_SANDBOX_URL),
      ...customTrustedOrigins,
    ].filter(Boolean) as string[],
  ),
)

export const auth = betterAuth({
  database: pool,
  secret: resolveAuthSecret(),
  baseURL,
  trustedOrigins: allTrustedOrigins,
  emailAndPassword: { enabled: true },
  advanced: {
    ipAddress: {
      ipAddressHeaders: [
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip",
        "x-forwarded-for",
        "x-client-ip",
      ],
      trustedProxies: ["127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "::1"],
    },
    ...(process.env.NODE_ENV === "development"
      ? {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        }
      : {}),
  },
})
