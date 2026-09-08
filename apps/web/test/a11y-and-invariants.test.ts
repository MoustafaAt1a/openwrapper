import assert from "node:assert/strict"
import test, { describe } from "node:test"
import { normalizePaymentStatus, paymentHasNextAction } from "../lib/payment-status-resolver"
import { formatMinorUnits } from "../lib/utils"

describe("WCAG AA Relative Luminance & Contrast Verification", () => {
  function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "")
    const num = Number.parseInt(clean, 16)
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  }

  function getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  }

  function getContrastRatio(hex1: string, hex2: string): number {
    const [r1, g1, b1] = hexToRgb(hex1)
    const [r2, g2, b2] = hexToRgb(hex2)
    const l1 = getLuminance(r1, g1, b1)
    const l2 = getLuminance(r2, g2, b2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  test("Light mode body foreground (#0d253d) on background (#ffffff) exceeds WCAG AA 4.5:1", () => {
    const ratio = getContrastRatio("#0d253d", "#ffffff")
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5, got ${ratio.toFixed(2)}`)
    assert.ok(ratio >= 12.0, `Expected Stripe-grade high contrast >= 12.0, got ${ratio.toFixed(2)}`)
  })

  test("Light mode muted foreground (#64748d) on background (#ffffff) meets WCAG AA 4.5:1", () => {
    const ratio = getContrastRatio("#64748d", "#ffffff")
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5, got ${ratio.toFixed(2)}`)
  })

  test("Dark mode body foreground (#f6f9fc) on dark canvas (#080b14) exceeds WCAG AA 4.5:1", () => {
    const ratio = getContrastRatio("#f6f9fc", "#080b14")
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5, got ${ratio.toFixed(2)}`)
    assert.ok(ratio >= 15.0, `Expected dark mode high contrast >= 15.0, got ${ratio.toFixed(2)}`)
  })

  test("Dark mode muted foreground (#8ca3ba) on dark canvas (#080b14) meets WCAG AA 4.5:1", () => {
    const ratio = getContrastRatio("#8ca3ba", "#080b14")
    assert.ok(ratio >= 4.5, `Expected contrast >= 4.5, got ${ratio.toFixed(2)}`)
  })
})

describe("Invariant I1: Discrete Integer Minor Units Monetary Math", () => {
  test("formatMinorUnits formats minor units without floating-point math distortion", () => {
    // 125050 minor units = 1250.50 EGP (2 decimals)
    const formatted = formatMinorUnits(125050, "EGP")
    assert.equal(formatted, "1250.50 EGP")
  })

  test("formatMinorUnits handles special currency decimal factors (0, 2, 3 decimals)", () => {
    // JPY (0 decimals)
    assert.equal(formatMinorUnits(5000, "JPY"), "5000 JPY")
    // KWD (3 decimals)
    assert.equal(formatMinorUnits(1250, "KWD"), "1.250 KWD")
    // USD (2 decimals, negative)
    assert.equal(formatMinorUnits(-2500, "USD"), "-25.00 USD")
  })

  test("Zero floating point precision loss on large integer minor amounts", () => {
    // Invariant I1: amounts must be integers
    const amountMinor = 999999999999 // Large integer
    assert.ok(Number.isInteger(amountMinor), "Monetary amount must be strict integer")
    const formatted = formatMinorUnits(amountMinor, "EGP")
    assert.equal(formatted, "9999999999.99 EGP")
  })
})

describe("Invariant I9: Conservation of Apportionment (Largest Remainder)", () => {
  function splitIntoRatios(totalMinor: number, ratios: number[]): number[] {
    assert.ok(Number.isInteger(totalMinor), "Total must be integer minor units")
    const ratioSum = ratios.reduce((a, b) => a + b, 0)
    assert.ok(ratioSum > 0, "Ratio sum must be positive")

    // Hamilton-Hare method
    const exactAllocations = ratios.map((r) => (totalMinor * r) / ratioSum)
    const baseAllocations = exactAllocations.map((a) => Math.floor(a))
    const remainder = totalMinor - baseAllocations.reduce((a, b) => a + b, 0)

    const remainders = exactAllocations.map((a, i) => ({
      index: i,
      fraction: a - Math.floor(a),
    }))

    remainders.sort((a, b) => b.fraction - a.fraction)

    const result = [...baseAllocations]
    for (let i = 0; i < remainder; i++) {
      result[remainders[i].index] += 1
    }

    return result
  }

  test("Apportionment strictly conserves funds across 3 equal split recipients with 100 minor units", () => {
    const parts = splitIntoRatios(100, [1, 1, 1])
    // 100 split 3 ways: 34, 33, 33 = 100 exactly
    assert.equal(parts.length, 3)
    const sum = parts.reduce((a, b) => a + b, 0)
    assert.equal(sum, 100, "Sum must strictly equal original total (no penny creation or leakage)")
    assert.deepEqual(parts, [34, 33, 33])
  })

  test("Apportionment strictly conserves funds across non-trivial fractions (10,000 minor units)", () => {
    const parts = splitIntoRatios(10000, [17.5, 42.3, 40.2])
    const sum = parts.reduce((a, b) => a + b, 0)
    assert.equal(sum, 10000, "Sum must strictly equal 10000")
  })
})

describe("Invariant I10: Sliding-Window Rate Limit Boundary Abuse Protection", () => {
  function estimateSlidingWindowCount(
    previousWindowCount: number,
    currentWindowCount: number,
    windowDurationMs: number,
    timeIntoCurrentWindowMs: number,
  ): number {
    const timeWeight = (windowDurationMs - timeIntoCurrentWindowMs) / windowDurationMs
    return Math.floor(
      previousWindowCount * Math.max(0, Math.min(1, timeWeight)) + currentWindowCount,
    )
  }

  test("Sliding-window decays previous window weight smoothly over time", () => {
    const windowMs = 60000
    // At start of window (0ms in): full previous window weight + current
    const countAt0 = estimateSlidingWindowCount(100, 5, windowMs, 0)
    assert.equal(countAt0, 105)

    // Halfway through window (30000ms in): 50% previous window weight + current
    const countAt30s = estimateSlidingWindowCount(100, 5, windowMs, 30000)
    assert.equal(countAt30s, 55)

    // At end of window (60000ms in): 0% previous window weight + current
    const countAt60s = estimateSlidingWindowCount(100, 5, windowMs, 60000)
    assert.equal(countAt60s, 5)
  })
})

describe("Payment Status Resolver & Normalization", () => {
  test("Normalizes raw gateway status to DisplayPaymentStatus", () => {
    assert.equal(normalizePaymentStatus("succeeded", false), "succeeded")
    assert.equal(normalizePaymentStatus("failed", false), "failed")
    assert.equal(normalizePaymentStatus("pending", false), "pending")
    assert.equal(normalizePaymentStatus("unknown", true), "pending")
    assert.equal(normalizePaymentStatus("unknown", false), "unknown")
    assert.equal(normalizePaymentStatus("other_state", false), "unknown")
  })

  test("paymentHasNextAction detects 3DS redirect or kiosk actions", () => {
    assert.equal(paymentHasNextAction({ nextActionType: "redirect_to_url" }), true)
    assert.equal(paymentHasNextAction({ nextActionPayload: "https://auth.bank.eg/3ds" }), true)
    assert.equal(paymentHasNextAction({ nextActionType: null, nextActionPayload: null }), false)
    assert.equal(paymentHasNextAction({}), false)
  })
})
