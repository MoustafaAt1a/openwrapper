import { createHash, timingSafeEqual } from "node:crypto"

/** Constant-time hex string comparison (matches Rust gateway pattern). */
export function constantTimeEqHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected.toLowerCase(), "utf8")
  const b = Buffer.from(received.toLowerCase(), "utf8")
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}

/**
 * Recursively canonicalizes JSON objects by lexicographically sorting keys.
 * Matches `core/src/idempotency.rs::canonicalize_json` exactly.
 */
export function canonicalizeJson(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(canonicalizeJson)
  }
  if (val !== null && typeof val === "object") {
    const sortedKeys = Object.keys(val as Record<string, unknown>).sort()
    const result: Record<string, unknown> = {}
    for (const key of sortedKeys) {
      result[key] = canonicalizeJson((val as Record<string, unknown>)[key])
    }
    return result
  }
  return val
}

/**
 * Computes deterministic SHA-256 fingerprint from canonicalized payload.
 * Mathematical equivalent to Rust core RequestFingerprint::of.
 */
export function computeCanonicalFingerprint(payload: unknown): string {
  const canonical = canonicalizeJson(payload)
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex")
}
