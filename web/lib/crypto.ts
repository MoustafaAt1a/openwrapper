import { timingSafeEqual } from "node:crypto"

/** Constant-time hex string comparison (matches Rust gateway pattern). */
export function constantTimeEqHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected.toLowerCase(), "utf8")
  const b = Buffer.from(received.toLowerCase(), "utf8")
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}
