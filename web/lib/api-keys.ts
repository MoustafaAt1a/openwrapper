import { createHash, randomBytes } from "node:crypto"

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex")
}

export function issueApiKey(environment: "live" | "test" = "live") {
  const secret = randomBytes(24).toString("base64url")
  const key = `ow_${environment}_${secret}`
  return {
    key,
    keyHash: hashApiKey(key),
    prefix: key.slice(0, 12),
    lastFour: key.slice(-4),
  }
}
