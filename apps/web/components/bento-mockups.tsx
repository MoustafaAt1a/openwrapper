"use client"

import {
  CheckmarkCircle01Icon,
  CreditCardIcon,
  LockIcon,
  ShieldCheckIcon,
  SmartPhone01Icon,
  Store01Icon,
  Tick01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"

/**
 * 1. MobileCheckoutMockup:
 * Clean, modern multi-rail checkout card demonstrating how OpenWrapper
 * wraps Meeza national cards, mobile wallets, and Fawry cash kiosks into one flow.
 */
export function MobileCheckoutMockup() {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | "fawry">("card")

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-sm rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-5 shadow-[0_4px_24px_rgba(0,55,112,0.06)]"
    >
      {/* Merchant Context Header */}
      <div className="flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#533afd] text-white text-[11px] font-semibold">
            OW
          </div>
          <div>
            <p className="text-xs font-medium text-[#0d253d] dark:text-white leading-tight">
              Cairo Artisan Roasters
            </p>
            <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba]">Order #OW-9281</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-[#0d253d] dark:text-white tabular-nums">
            250.00 EGP
          </span>
        </div>
      </div>

      {/* Method Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f6f9fc] dark:bg-[#141b33] p-1 border border-[#e3e8ee] dark:border-white/10 text-xs font-medium my-3.5">
        <button
          type="button"
          onClick={() => setSelectedMethod("card")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "card"
              ? "bg-white dark:bg-[#0f1426] text-[#533afd] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
          }`}
        >
          <HugeiconsIcon icon={CreditCardIcon} size={14} />
          <span>Card</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMethod("wallet")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "wallet"
              ? "bg-white dark:bg-[#0f1426] text-[#533afd] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
          }`}
        >
          <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
          <span>Wallet</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMethod("fawry")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "fawry"
              ? "bg-white dark:bg-[#0f1426] text-[#533afd] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
          }`}
        >
          <HugeiconsIcon icon={Store01Icon} size={14} />
          <span>Fawry</span>
        </button>
      </div>

      {/* Dynamic Payment State Panel */}
      {selectedMethod === "card" && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 px-3 py-2">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium mb-0.5">
              Card Number
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tabular-nums text-[#0d253d] dark:text-white">
                5078 0300 0000 0001
              </span>
              <span className="rounded bg-[#533afd]/10 dark:bg-[#533afd]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#533afd] dark:text-[#a8b1ff]">
                MEEZA DEBIT
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 px-3 py-2">
              <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium mb-0.5">
                Expires
              </label>
              <span className="text-xs font-medium tabular-nums text-[#0d253d] dark:text-white">
                12 / 28
              </span>
            </div>
            <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 px-3 py-2">
              <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium mb-0.5">
                CVC / CVV
              </label>
              <span className="text-xs font-medium tabular-nums text-[#0d253d] dark:text-white">
                •••
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedMethod === "wallet" && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 px-3 py-2">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium mb-0.5">
              Mobile Wallet Number
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tabular-nums text-[#0d253d] dark:text-white">
                +20 101 000 0000
              </span>
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                Vodafone Cash
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] leading-relaxed">
            Direct mobile wallet prompt will be initiated to authorize deduction.
          </p>
        </div>
      )}

      {selectedMethod === "fawry" && (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 p-3 text-center">
            <span className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block mb-1 font-medium">
              Kiosk Bill Reference Number
            </span>
            <span className="font-mono text-lg font-bold text-[#0d253d] dark:text-white tracking-widest">
              982 411 028
            </span>
            <span className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block mt-1">
              Pay in cash at any of 180,000+ Fawry POS nationwide
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#533afd] py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#4434d4] transition-colors cursor-pointer"
      >
        <HugeiconsIcon icon={LockIcon} size={13} />
        <span>Pay 250.00 EGP</span>
      </button>

      {/* Trust Footer */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
        <HugeiconsIcon icon={ShieldCheckIcon} size={13} className="text-emerald-500" />
        <span>Stateless Zero-Knowledge Transit</span>
      </div>
    </motion.div>
  )
}

/**
 * 2. DesktopCheckoutMockup:
 * Clean split order summary with integer minor units and multi-rail authorization.
 */
export function DesktopCheckoutMockup() {
  return (
    <div className="w-full rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0c1024] p-5 shadow-[0_4px_20px_rgba(0,55,112,0.05)]">
      {/* Top Browser Bar */}
      <div className="mb-4 flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#e3e8ee] dark:bg-white/20" />
          <span className="size-2.5 rounded-full bg-[#e3e8ee] dark:bg-white/20" />
          <span className="size-2.5 rounded-full bg-[#e3e8ee] dark:bg-white/20" />
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-[#f6f9fc] dark:bg-[#141b33] px-3 py-1 text-xs text-[#64748d] dark:text-[#8ca3ba]">
          <HugeiconsIcon icon={LockIcon} size={12} className="text-emerald-500" />
          <span>checkout.openwrapper.org/pay/ow_session_49f8</span>
        </div>
        <div className="size-4" />
      </div>

      {/* Split Content */}
      <div className="grid gap-5 md:grid-cols-12 items-start">
        {/* Left 5 Cols: Order Summary */}
        <div className="md:col-span-5 flex flex-col gap-3 rounded-lg bg-[#f6f9fc] dark:bg-[#11162e] p-4 border border-[#e3e8ee] dark:border-white/10">
          <span className="text-[11px] font-medium text-[#64748d] dark:text-[#8ca3ba]">
            Invoice OW-2026-881
          </span>
          <div className="flex items-baseline justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-2">
            <span className="text-xs text-[#273951] dark:text-[#c2d1e0]">
              Native Rust Engine Pro
            </span>
            <span className="tabular-nums text-xs font-semibold text-[#0d253d] dark:text-white">
              $49.00
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
            <span>Minor units parameter</span>
            <span className="font-mono tabular-nums">4,900 minor</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-[#e3e8ee] dark:border-white/10 pt-2 font-semibold">
            <span className="text-xs text-[#0d253d] dark:text-white">Total Due</span>
            <span className="tabular-nums text-sm text-[#533afd] dark:text-[#a8b1ff]">
              $49.00 USD
            </span>
          </div>
        </div>

        {/* Right 7 Cols: Payment Form Preview */}
        <div className="md:col-span-7 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-[#533afd] bg-[#533afd]/5 px-3 py-2 text-center text-xs font-medium text-[#533afd] dark:text-white">
              Card & Meeza
            </div>
            <div className="flex-1 rounded-md border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-center text-xs text-[#64748d] dark:text-[#8ca3ba]">
              Apple Pay
            </div>
            <div className="flex-1 rounded-md border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-center text-xs text-[#64748d] dark:text-[#8ca3ba]">
              InstaPay
            </div>
          </div>

          <div className="rounded-md border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-xs">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium">
              Cardholder Name
            </label>
            <span className="font-medium text-[#0d253d] dark:text-white">Tarek Al-Sayed</span>
          </div>

          <div className="rounded-md border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-xs">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-medium">
              Card Number & Rail
            </label>
            <div className="flex items-center justify-between">
              <span className="text-[#0d253d] dark:text-white tabular-nums">
                4242 •••• •••• 4242
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                3DS Verified
              </span>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#533afd] py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#4434d4] transition-colors"
          >
            <span>Authorize & Settle ($49.00)</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 3. LedgerTelemetryMockup:
 * Real-time transaction ledger table displaying exact minor units,
 * microsecond latencies, HMAC verified states, and upstream rails.
 */
export function LedgerTelemetryMockup() {
  const transactions = [
    {
      id: "tx_01hm9q7k",
      rail: "Paymob (Meeza)",
      amount: "250.00 EGP",
      latency: "9.2ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hm9q5a",
      rail: "Fawry Kiosk",
      amount: "1,200.00 EGP",
      latency: "14.1ms",
      status: "Pending Kiosk",
      statusColor: "amber",
    },
    {
      id: "tx_01hm9q2e",
      rail: "Stripe 3DS",
      amount: "49.00 USD",
      latency: "28.5ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hm9py8",
      rail: "Vodafone Cash",
      amount: "450.00 EGP",
      latency: "11.7ms",
      status: "Successful",
      statusColor: "emerald",
    },
  ]

  const [activeRow, setActiveRow] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveRow((prev) => (prev + 1) % transactions.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [transactions.length])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full overflow-hidden rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] shadow-[0_4px_24px_rgba(0,55,112,0.06)]"
    >
      {/* Header telemetry bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33]/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-[#0d253d] dark:text-white">
            Gateway Ledger Stream
          </span>
          <span className="rounded bg-[#533afd]/10 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#533afd] dark:text-[#a8b1ff]">
            Axum 0.8 :8080
          </span>
        </div>
        <div className="text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
          P95:{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            11.4ms
          </span>{" "}
          · Invariant I1
        </div>
      </div>

      {/* Table with clean responsive column styling */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-full">
          <thead>
            <tr className="border-b border-[#e3e8ee] dark:border-white/10 text-[10px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
              <th className="px-4 py-2.5 font-medium">Transaction</th>
              <th className="px-3 py-2.5 font-medium">Rail</th>
              <th className="px-3 py-2.5 font-medium">Amount</th>
              <th className="hidden sm:table-cell px-3 py-2.5 font-medium">Latency</th>
              <th className="px-4 py-2.5 text-right sm:text-left font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e3e8ee] dark:divide-white/5">
            {transactions.map((t, idx) => (
              <tr
                key={t.id}
                className={`transition-colors duration-200 ${
                  activeRow === idx
                    ? "bg-[#533afd]/5 dark:bg-[#533afd]/15"
                    : "hover:bg-[#f6f9fc]/60 dark:hover:bg-white/5"
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-[#533afd] dark:text-[#a8b1ff] font-medium text-xs">
                  {t.id}
                </td>
                <td className="px-3 py-2.5 text-[#273951] dark:text-[#c2d1e0] text-xs">{t.rail}</td>
                <td className="px-3 py-2.5 text-[#0d253d] dark:text-white tabular-nums font-medium text-xs whitespace-nowrap">
                  {t.amount}
                </td>
                <td className="hidden sm:table-cell px-3 py-2.5 text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
                  {t.latency}
                </td>
                <td className="px-4 py-2.5 text-right sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                      t.statusColor === "emerald"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    <HugeiconsIcon icon={Tick01Icon} size={11} />
                    <span>{t.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/**
 * 3. ZeroKnowledgeSecurityMockup:
 * Visual TLS Header Inspector showing Zero Credential Persistence to disk or DB.
 */
export function ZeroKnowledgeSecurityMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#0c1024] p-5 text-white shadow-[0_4px_24px_rgba(0,55,112,0.06)]"
    >
      <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
            <HugeiconsIcon icon={ShieldCheckIcon} size={14} />
          </div>
          <span className="text-xs font-medium">Stateless TLS Ingress Pipeline</span>
        </div>
        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          Invariant I3
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2.5 border border-white/5 gap-1">
          <span className="font-mono text-[#a8b1ff] text-[11px]">X-Paymob-Api-Key</span>
          <span className="text-[#8ca3ba] text-[11px]">
            sec_live_•••••••••••••• (Transient TLS only)
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2.5 border border-white/5 gap-1">
          <span className="font-mono text-[#a8b1ff] text-[11px]">X-Fawry-Secret</span>
          <span className="text-[#8ca3ba] text-[11px]">
            faw_sec_•••••••••••• (Never written to DB)
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2.5 border border-white/5 gap-1">
          <span className="font-mono text-[#a8b1ff] text-[11px]">Idempotency-Key</span>
          <span className="text-emerald-400 font-mono tabular-nums text-[11px]">
            idemp_2026_9a4b81c (SHA-256 locked)
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-[#8ca3ba]">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={LockIcon} size={12} className="text-emerald-400" />
          <span>RAM-only transit stream</span>
        </span>
        <span className="text-emerald-400 font-medium">0 Secrets Persisted to Disk</span>
      </div>
    </motion.div>
  )
}

/**
 * 4. SovereignCardMockup:
 * Precision Sovereign Currency & Meeza clearing inspector with strict integer minor units.
 */
export function SovereignCardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full max-w-sm rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-5 shadow-[0_4px_24px_rgba(0,55,112,0.06)] flex flex-col gap-3.5"
    >
      {/* Meeza Card Header */}
      <div className="rounded-xl bg-gradient-to-br from-[#1c1e54] via-[#232050] to-[#0f1123] text-white p-4 flex flex-col justify-between aspect-[1.7] shadow-md border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-[#ffd280]/20 border border-[#ffd280]/40 flex items-center justify-center">
              <HugeiconsIcon icon={ZapIcon} size={13} className="text-[#ffd280]" />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-white/80">
              Central Bank of Egypt
            </span>
          </div>
          <span className="text-[10px] font-semibold text-white/90">Sovereign Rail</span>
        </div>

        <div className="font-mono text-sm tracking-widest text-white/90 drop-shadow-xs">
          5078 0300 0000 0001
        </div>

        <div className="flex items-end justify-between text-[10px]">
          <div>
            <span className="text-[#8ca3ba] block text-[9px]">Card Scheme</span>
            <span className="font-semibold text-white">Meeza National Debit</span>
          </div>
          <div className="text-right">
            <span className="text-[#ffd280] font-mono text-[9px] block">EGP Minor Units</span>
            <span className="font-bold text-white tracking-wider">ميزة MEEZA</span>
          </div>
        </div>
      </div>

      {/* Integer Minor Unit Math Breakdown */}
      <div className="rounded-lg bg-[#f6f9fc] dark:bg-[#141b33]/60 border border-[#e3e8ee] dark:border-white/10 p-3 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba]">
          <span>Display Amount</span>
          <span className="font-medium text-[#0d253d] dark:text-white tabular-nums">
            250.00 EGP
          </span>
        </div>
        <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba]">
          <span>Engine Minor Units (piasters)</span>
          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
            25,000 minor (i64)
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e3e8ee] dark:border-white/10 pt-1.5 text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
            <span>Zero IEEE 754 float drift</span>
          </span>
          <span className="font-mono">Invariant I1</span>
        </div>
      </div>
    </motion.div>
  )
}
