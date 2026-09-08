import { createHash, randomBytes } from "node:crypto"

export type ApiKeyEnvironment = "live" | "test"

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex")
}

export function getApiKeyEnvironment(keyOrPrefix: string): ApiKeyEnvironment {
  const normalized = keyOrPrefix.trim().toLowerCase()
  if (
    normalized.startsWith("ow_test") ||
    normalized === "ow_test_sandbox_demo" ||
    normalized === "ow_demo_sandbox_key"
  ) {
    return "test"
  }
  return "live"
}

export function issueApiKey(environment: ApiKeyEnvironment = "live") {
  const env: ApiKeyEnvironment = environment === "test" ? "test" : "live"
  const secret = randomBytes(24).toString("base64url")
  const key = `ow_${env}_${secret}`
  return {
    key,
    environment: env,
    keyHash: hashApiKey(key),
    prefix: key.slice(0, 12),
    lastFour: key.slice(-4),
  }
}
