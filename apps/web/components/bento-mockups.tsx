"use client"

import {
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
 * Realistic smartphone frame showing honest Egyptian sovereign payment methods
 * (Meeza national debit, Vodafone/Orange mobile wallet, Fawry retail kiosk code).
 */
export function MobileCheckoutMockup() {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | "fawry">("card")

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-[290px] xs:max-w-[310px] sm:max-w-[320px] rounded-[32px] sm:rounded-[36px] border-[4px] sm:border-[5px] border-[#1a1f36] bg-[#0c1024] p-2.5 sm:p-3 shadow-2xl ring-1 ring-black/10"
    >
      {/* Smartphone Speaker / Notch */}
      <div className="relative mb-2.5 flex items-center justify-between px-2.5 pt-1 text-[10px] font-medium text-[#8ca3ba]">
        <span>9:41</span>
        <div className="h-3 w-16 sm:w-18 rounded-full bg-[#1a1f36]" />
        <div className="flex items-center gap-1">
          <span className="text-[9px]">5G</span>
          <div className="h-2 w-3.5 rounded-xs border border-[#8ca3ba] p-0.5">
            <div className="h-full w-2 bg-[#8ca3ba]" />
          </div>
        </div>
      </div>

      {/* Screen Inner Card */}
      <div className="rounded-[24px] bg-white dark:bg-[#11162e] p-4 text-[#0d253d] dark:text-white shadow-inner flex flex-col gap-3.5">
        {/* Merchant Header */}
        <div className="flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-[#533afd] text-white text-[10px] font-bold">
              OW
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Cairo Artisan Roasters</p>
              <p className="text-[10px] text-[#64748d] dark:text-[#8ca3ba]">Order #OW-9281</p>
            </div>
          </div>
          <span className="font-mono font-tnum text-xs font-bold text-[#0d253d] dark:text-white">
            250.00 EGP
          </span>
        </div>

        {/* Method Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f6f9fc] dark:bg-[#0c1024] p-1 border border-[#e3e8ee] dark:border-white/10 text-[10px] font-medium">
          <button
            type="button"
            onClick={() => setSelectedMethod("card")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${
              selectedMethod === "card"
                ? "bg-white dark:bg-[#1e2646] text-[#533afd] dark:text-white shadow-xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]"
            }`}
          >
            <HugeiconsIcon icon={CreditCardIcon} size={13} />
            <span>Meeza/Card</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod("wallet")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${
              selectedMethod === "wallet"
                ? "bg-white dark:bg-[#1e2646] text-[#533afd] dark:text-white shadow-xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]"
            }`}
          >
            <HugeiconsIcon icon={SmartPhone01Icon} size={13} />
            <span>Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod("fawry")}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${
              selectedMethod === "fawry"
                ? "bg-white dark:bg-[#1e2646] text-[#533afd] dark:text-white shadow-xs"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]"
            }`}
          >
            <HugeiconsIcon icon={Store01Icon} size={13} />
            <span>Fawry POS</span>
          </button>
        </div>

        {/* Dynamic Payment State Panel */}
        {selectedMethod === "card" && (
          <div className="flex flex-col gap-2 pt-0.5">
            <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-2.5 py-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block font-mono">
                Card Number
              </label>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#0d253d] dark:text-white">
                  5078 0300 0000 0001
                </span>
                <span className="rounded bg-[#533afd]/15 px-1 py-0.5 font-mono text-[9px] font-bold text-[#533afd] dark:text-[#8c82fc]">
                  MEEZA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-2.5 py-1.5">
                <label className="text-[9px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block font-mono">
                  Expires
                </label>
                <span className="font-mono text-xs text-[#0d253d] dark:text-white">12 / 28</span>
              </div>
              <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-2.5 py-1.5">
                <label className="text-[9px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block font-mono">
                  CVC / CVV
                </label>
                <span className="font-mono text-xs text-[#0d253d] dark:text-white">•••</span>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === "wallet" && (
          <div className="flex flex-col gap-2 pt-0.5">
            <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-2.5 py-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block font-mono">
                Mobile Number
              </label>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#0d253d] dark:text-white">
                  +20 101 000 0000
                </span>
                <span className="rounded bg-red-500/15 px-1 py-0.5 font-mono text-[9px] font-bold text-red-500">
                  Vodafone Cash
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] leading-tight">
              An OTP prompt will be pushed to your registered mobile wallet.
            </p>
          </div>
        )}

        {selectedMethod === "fawry" && (
          <div className="flex flex-col gap-2 pt-0.5">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-center">
              <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 block font-mono">
                Retail Reference Code
              </span>
              <span className="font-mono text-base font-bold text-[#0d253d] dark:text-white tracking-widest">
                982 411 028
              </span>
              <span className="text-[9px] text-[#64748d] dark:text-[#8ca3ba] block mt-0.5">
                Pay at any of 180,000+ Fawry POS nationwide
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#4434d4] transition-colors"
        >
          <HugeiconsIcon icon={LockIcon} size={12} />
          <span>Pay 250.00 EGP</span>
        </button>

        {/* Footer Guarantee */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#64748d] dark:text-[#8ca3ba] font-mono">
          <HugeiconsIcon icon={ShieldCheckIcon} size={11} className="text-emerald-500" />
          <span>Stateless Zero-Knowledge Encryption</span>
        </div>
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
    <div className="w-full rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0c1024] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      {/* Top Browser Bar */}
      <div className="mb-4 flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-[#f6f9fc] dark:bg-[#141b33] px-3 py-1 font-mono text-[10px] text-[#64748d] dark:text-[#8ca3ba]">
          <HugeiconsIcon icon={LockIcon} size={10} className="text-emerald-500" />
          <span>checkout.openwrapper.org/pay/ow_session_49f8</span>
        </div>
        <div className="size-4" />
      </div>

      {/* Split Content */}
      <div className="grid gap-5 md:grid-cols-12 items-start">
        {/* Left 5 Cols: Order Summary */}
        <div className="md:col-span-5 flex flex-col gap-3 rounded-xl bg-[#f6f9fc] dark:bg-[#11162e] p-4 border border-[#e3e8ee] dark:border-white/10">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
            Invoice OW-2026-881
          </span>
          <div className="flex items-baseline justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-2">
            <span className="text-xs text-[#273951] dark:text-[#c2d1e0]">
              Native Rust Engine Pro
            </span>
            <span className="font-mono font-tnum text-xs font-semibold text-[#0d253d] dark:text-white">
              $49.00
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
            <span>Minor units parameter</span>
            <span className="font-mono">4,900 minor</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-[#e3e8ee] dark:border-white/10 pt-2 font-semibold">
            <span className="text-xs text-[#0d253d] dark:text-white">Total Due</span>
            <span className="font-mono text-sm text-[#533afd] dark:text-[#8c82fc]">$49.00 USD</span>
          </div>
        </div>

        {/* Right 7 Cols: Payment Form Preview */}
        <div className="md:col-span-7 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-[#533afd] bg-[#533afd]/5 px-3 py-2 text-center text-xs font-medium text-[#533afd] dark:text-white">
              Card & Meeza
            </div>
            <div className="flex-1 rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-center text-xs text-[#64748d] dark:text-[#8ca3ba]">
              Apple Pay
            </div>
            <div className="flex-1 rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-center text-xs text-[#64748d] dark:text-[#8ca3ba]">
              InstaPay
            </div>
          </div>

          <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-xs">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-mono">
              Cardholder Name
            </label>
            <span className="font-medium text-[#0d253d] dark:text-white">Tarek Al-Sayed</span>
          </div>

          <div className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#161c38] px-3 py-2 text-xs">
            <label className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] block font-mono">
              Card Number & Rail
            </label>
            <div className="flex items-center justify-between font-mono">
              <span className="text-[#0d253d] dark:text-white">4242 •••• •••• 4242</span>
              <span className="text-[10px] text-emerald-500 font-semibold">3DS VERIFIED</span>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#533afd] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#4434d4] transition-colors"
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
      minor: "25000",
      latency: "9.2ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hm9q5a",
      rail: "Fawry Kiosk",
      amount: "1,200.00 EGP",
      minor: "120000",
      latency: "14.1ms",
      status: "Pending Kiosk",
      statusColor: "amber",
    },
    {
      id: "tx_01hm9q2e",
      rail: "Stripe 3DS",
      amount: "49.00 USD",
      minor: "4900",
      latency: "28.5ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hm9py8",
      rail: "Vodafone Cash",
      amount: "450.00 EGP",
      minor: "45000",
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
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="w-full overflow-hidden rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0c1024] shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
    >
      {/* Header telemetry bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#11162e] px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white">
            Live Gateway Ledger
          </span>
          <span className="rounded bg-[#533afd]/10 dark:bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#533afd] dark:text-[#8c82fc]">
            Axum 0.8 :8080
          </span>
        </div>
        <div className="font-mono text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
          P95: <span className="font-semibold text-emerald-500 font-tnum">11.4ms</span> · Invariant
          I1
        </div>
      </div>

      {/* Table with responsive column hiding */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left font-mono text-xs min-w-full">
          <thead>
            <tr className="border-b border-[#e3e8ee] dark:border-white/10 text-[10px] uppercase text-[#64748d] dark:text-[#8ca3ba]">
              <th className="px-3 sm:px-4 py-2.5">Transaction</th>
              <th className="px-2 sm:px-4 py-2.5">Rail</th>
              <th className="px-2 sm:px-4 py-2.5">Amount</th>
              <th className="hidden sm:table-cell px-4 py-2.5">P95 Latency</th>
              <th className="px-3 sm:px-4 py-2.5 text-right sm:text-left">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e3e8ee] dark:divide-white/5">
            {transactions.map((t, idx) => (
              <tr
                key={t.id}
                className={`transition-colors duration-300 ${
                  activeRow === idx
                    ? "bg-[#533afd]/5 dark:bg-[#533afd]/15"
                    : "hover:bg-[#f6f9fc]/60 dark:hover:bg-white/5"
                }`}
              >
                <td className="px-3 sm:px-4 py-2.5 text-[#533afd] dark:text-[#8c82fc] font-semibold text-[11px] sm:text-xs">
                  {t.id}
                </td>
                <td className="px-2 sm:px-4 py-2.5 text-[#273951] dark:text-[#c2d1e0] text-[11px] sm:text-xs">
                  {t.rail}
                </td>
                <td className="px-2 sm:px-4 py-2.5 text-[#0d253d] dark:text-white font-tnum text-[11px] sm:text-xs whitespace-nowrap">
                  {t.amount}
                </td>
                <td className="hidden sm:table-cell px-4 py-2.5 text-emerald-500 font-tnum text-xs">
                  {t.latency}
                </td>
                <td className="px-3 sm:px-4 py-2.5 text-right sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${
                      t.statusColor === "emerald"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <HugeiconsIcon icon={Tick01Icon} size={10} />
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
 * 4. ZeroKnowledgeSecurityMockup:
 * Visual TLS Header Inspector showing Zero Credential Persistence to disk or DB.
 */
export function ZeroKnowledgeSecurityMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      className="w-full rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-[#0c1024] p-4 text-white shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
            <HugeiconsIcon icon={ShieldCheckIcon} size={14} />
          </div>
          <span className="font-mono text-xs font-semibold">Stateless Zero-Knowledge Transit</span>
        </div>
        <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          Invariant I3
        </span>
      </div>

      <div className="space-y-2 font-mono text-[11px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2 border border-white/5 gap-1">
          <span className="text-[#8c82fc]">X-Paymob-Api-Key:</span>
          <span className="text-[#8ca3ba]">sec_live_•••••••••••••• (Transient TLS only)</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2 border border-white/5 gap-1">
          <span className="text-[#8c82fc]">X-Fawry-Secret:</span>
          <span className="text-[#8ca3ba]">faw_sec_•••••••••••• (Never written to DB)</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#141b33] p-2 border border-white/5 gap-1">
          <span className="text-[#8c82fc]">Idempotency-Key:</span>
          <span className="text-emerald-400 font-tnum">idemp_2026_9a4b81c (SHA-256 locked)</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[10px] text-[#8ca3ba]">
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={LockIcon} size={11} className="text-emerald-400" />
          <span>RAM-only cipher stream</span>
        </span>
        <span className="font-mono text-emerald-400">0 Secrets Persisted to Disk</span>
      </div>
    </motion.div>
  )
}

/**
 * 5. SovereignCardMockup:
 * Pure geometric Meeza debit card with contact-less EMV chip, Central Bank of Egypt logo,
 * holographic elements, and strict minor-unit currency routing.
 */
export function SovereignCardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="relative mx-auto w-full max-w-[340px] aspect-[1.586] rounded-2xl p-5 shadow-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#1c1e54] via-[#2a1b4e] to-[#0f1123] text-white flex flex-col justify-between cursor-pointer"
    >
      {/* Subtle Geometric Background Waves */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -top-10 -right-10 size-48 rounded-full bg-gradient-to-br from-[#533afd] to-[#ea2261] blur-2xl" />
        <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-gradient-to-tr from-[#ffd280] to-transparent blur-xl" />
      </div>

      {/* Card Header: EMV Chip & Contactless */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Realistic EMV Metallic Chip */}
          <div className="size-9 rounded-md bg-gradient-to-br from-[#ffd280] via-[#f5a623] to-[#d48806] p-1.5 shadow-inner border border-[#d48806]/60 flex flex-col justify-between">
            <div className="h-0.5 w-full bg-black/20" />
            <div className="h-0.5 w-full bg-black/20" />
          </div>
          <HugeiconsIcon icon={ZapIcon} size={16} className="text-[#ffd280] rotate-90" />
        </div>
        <div className="text-right">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#a1b0cb] block">
            Central Bank of Egypt
          </span>
          <span className="text-xs font-bold tracking-tight text-white">Sovereign Rail</span>
        </div>
      </div>

      {/* Card Number */}
      <div className="relative z-10 font-mono text-base tracking-[0.2em] font-medium text-white/90 drop-shadow-sm">
        5078 0300 0000 0001
      </div>

      {/* Card Footer: Holder & Meeza Logo */}
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#a1b0cb] block">
            Authorized Merchant
          </span>
          <span className="text-xs font-semibold tracking-wide">OPENWRAPPER STORE</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-wider text-white border border-white/20">
            MEEZA ميزة
          </span>
          <span className="font-mono text-[9px] text-[#ffd280] mt-0.5">EGP Minor Units</span>
        </div>
      </div>
    </motion.div>
  )
}
