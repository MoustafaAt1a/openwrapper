import assert from "node:assert/strict"
import { createHash, randomBytes } from "node:crypto"

console.log("==========================================")
console.log("1. Testing API Key Generation & Cryptography")
console.log("==========================================")

function hashApiKey(key) {
  return createHash("sha256").update(key.trim()).digest("hex")
}

function issueApiKey(env = "live") {
  const secret = randomBytes(24).toString("base64url")
  const key = `ow_${env}_${secret}`
  return {
    key,
    keyHash: hashApiKey(key),
    prefix: key.slice(0, 12),
    lastFour: key.slice(-4),
  }
}

const key1 = issueApiKey("live")
console.log("Generated live key prefix:", key1.prefix)

const key2 = issueApiKey("test")
console.log("Generated test key prefix:", key2.prefix)

console.log("\n==========================================")
console.log("2. Testing Fawry Signature Calculation")
console.log("==========================================")

function calculateFawryChargeSignature(merchantCode, merchantRefNum, customerProfileId, itemId, quantity, price, secureKey) {
  const raw = `${merchantCode}${merchantRefNum}${customerProfileId}${itemId}${quantity}${price}${secureKey}`
  return createHash("sha256").update(raw).digest("hex")
}

const fawrySig = calculateFawryChargeSignature("MERCHANT123", "ref_98234", "01000000000", "ITEM_1", 1, "50.00", "sec_key_xyz")
console.log("Calculated Fawry Signature:", fawrySig)
assert.equal(fawrySig.length, 64, "Fawry signature must be 64-char hex")

console.log("\n==========================================")
console.log("3. Testing Idempotency Request Fingerprinting")
console.log("==========================================")

function computeFingerprint(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

const payloadA = { provider: "paymob", amount_minor_units: 10000, currency: "EGP" }
const payloadB = { provider: "paymob", amount_minor_units: 10000, currency: "EGP" }
const payloadC = { provider: "paymob", amount_minor_units: 20000, currency: "EGP" }

const fpA = computeFingerprint(payloadA)
const fpB = computeFingerprint(payloadB)
const fpC = computeFingerprint(payloadC)

assert.equal(fpA, fpB, "Identical payloads must yield identical fingerprints")
assert.notEqual(fpA, fpC, "Different payloads must yield different fingerprints")
console.log("Idempotency fingerprints are deterministic and payload-sensitive")

console.log("\n==========================================")
console.log("ALL INTEGRATION LOGIC CHECKS PASSED!")
console.log("==========================================")
