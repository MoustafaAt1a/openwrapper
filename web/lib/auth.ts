import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

function asOrigin(value?: string) {
  if (!value) return undefined
  return value.startsWith("http") ? value : `https://${value}`
}

const baseURL =
  process.env.BETTER_AUTH_URL ??
  asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  asOrigin(process.env.VERCEL_URL) ??
  process.env.V0_RUNTIME_URL ??
  "http://localhost:3000"

const developmentOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
].filter(Boolean) as string[]

const productionOrigins = [
  asOrigin(process.env.VERCEL_URL),
  asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  asOrigin(process.env.BETTER_AUTH_URL),
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || "openwrapper-cloud-default-secret-production-standalone-key",
  baseURL,
  trustedOrigins:
    process.env.NODE_ENV === "development"
      ? developmentOrigins
      : productionOrigins.length
      ? productionOrigins
      : ["http://localhost:3000"],
  emailAndPassword: { enabled: true },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
