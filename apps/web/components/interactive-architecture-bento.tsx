"use client"

import {
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  Smartphone,
  Store,
  Zap,
} from "lucide-react"
import { useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"

/**
 * 1. MobileCheckoutMockup:
 * Clean, modern multi-rail checkout card demonstrating how OpenWrapper
 * wraps Meeza national cards, mobile wallets, and Fawry cash kiosks into one flow.
 */
export function MobileCheckoutMockup() {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | "fawry">("card")

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f1426] p-4 sm:p-5 shadow-xs transition-all">
      {/* Merchant Context Header */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#4f46e5] text-white text-[11px] font-semibold">
            OW
          </div>
          <div>
            <p className="text-xs font-medium text-[#0f172a] dark:text-white leading-tight">
              Cairo Artisan Roasters
            </p>
            <p className="text-[11px] text-[#64748d] dark:text-[#94a3b8]">Order #OW-9281</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-[#0f172a] dark:text-white tabular-nums">
            250.00 EGP
          </span>
        </div>
      </div>

      {/* Method Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f8fafc] dark:bg-[#141b33] p-1 border border-[#e2e8f0] dark:border-white/10 text-xs font-medium my-3">
        <button
          type="button"
          onClick={() => setSelectedMethod("card")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "card"
              ? "bg-white dark:bg-[#0f1426] text-[#4f46e5] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Card</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMethod("wallet")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "wallet"
              ? "bg-white dark:bg-[#0f1426] text-[#4f46e5] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Wallet</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMethod("fawry")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
            selectedMethod === "fawry"
              ? "bg-white dark:bg-[#0f1426] text-[#4f46e5] dark:text-white shadow-xs font-semibold"
              : "text-[#64748d] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Fawry</span>
        </button>
      </div>

      {/* Dynamic Payment State Panel */}
      {selectedMethod === "card" && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 px-3 py-2">
            <label className="text-[10px] text-[#64748d] dark:text-[#94a3b8] block font-medium mb-0.5">
              Card Number
            </label>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#0f172a] dark:text-white tracking-wider">
                5078 0300 0000 0001
              </span>
              <span className="rounded bg-[#ecfdf5] dark:bg-emerald-500/20 text-[#047857] dark:text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 font-semibold border border-emerald-200 dark:border-emerald-500/30">
                MEEZA DEBIT
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 px-3 py-1.5">
              <label className="text-[10px] text-[#64748d] dark:text-[#94a3b8] block font-medium">
                Expires
              </label>
              <span className="font-mono text-xs text-[#0f172a] dark:text-white">12 / 28</span>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 px-3 py-1.5">
              <label className="text-[10px] text-[#64748d] dark:text-[#94a3b8] block font-medium">
                CVV
              </label>
              <span className="font-mono text-xs text-[#0f172a] dark:text-white">•••</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full mt-1.5 flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Pay 250.00 EGP</span>
          </button>
        </div>
      )}

      {selectedMethod === "wallet" && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 px-3 py-2">
            <label className="text-[10px] text-[#64748d] dark:text-[#94a3b8] block font-medium mb-0.5">
              Mobile Wallet Number
            </label>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#0f172a] dark:text-white">
                +20 101 234 5678
              </span>
              <span className="rounded bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-mono text-[9px] px-1.5 py-0.5 font-medium border border-rose-200 dark:border-rose-500/30">
                Vodafone Cash
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-full mt-1.5 flex items-center justify-center gap-2 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <span>Request OTP Push</span>
          </button>
        </div>
      )}

      {selectedMethod === "fawry" && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 p-3 text-center">
            <span className="text-[10px] text-[#64748d] dark:text-[#94a3b8] block">
              Fawry Kiosk Cash Reference
            </span>
            <span className="font-mono text-base font-bold tracking-wider text-[#0f172a] dark:text-white my-1 block">
              9482 9104
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full inline-block">
              Pay at any Aman or Fawry POS within 48h
            </span>
          </div>
        </div>
      )}

      {/* Security Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] dark:border-white/10 flex items-center justify-center gap-1.5 text-[10px] text-[#64748d] dark:text-[#94a3b8]">
        <CheckCircle2
          className="w-3 h-3 text-emerald-500 shrink-0"
        />
        <span>Stateless Zero-Knowledge Ingress</span>
      </div>
    </div>
  )
}

/**
 * 2. LedgerTelemetryMockup:
 * Clean, minimalist live transaction ledger stream.
 */
export function LedgerTelemetryMockup() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: "50px", once: false })

  const transactions = [
    {
      id: "tx_01hr9q7k",
      rail: "Paymob (Meeza)",
      amount: "250.00 EGP",
      latency: "9.2ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hr9q5a",
      rail: "Fawry Kiosk",
      amount: "1,200.00 EGP",
      latency: "14.1ms",
      status: "Pending Kiosk",
      statusColor: "amber",
    },
    {
      id: "tx_01hr9q2e",
      rail: "Stripe 3DS",
      amount: "49.00 USD",
      latency: "28.5ms",
      status: "Successful",
      statusColor: "emerald",
    },
    {
      id: "tx_01hr9py8",
      rail: "Vodafone Cash",
      amount: "450.00 EGP",
      latency: "11.7ms",
      status: "Successful",
      statusColor: "emerald",
    },
  ]

  const [activeRow, setActiveRow] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const timer = setInterval(() => {
      setActiveRow((prev) => (prev + 1) % transactions.length)
    }, 2800)

    return () => clearInterval(timer)
  }, [isInView, transactions.length])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f1426] shadow-xs"
    >
      {/* Header telemetry bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-[#0f172a] dark:text-white">
            Gateway Ledger Stream
          </span>
          <span className="rounded bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 px-2 py-0.5 text-[10px] font-medium text-[#4f46e5] dark:text-[#818cf8]">
            Axum 0.7 :8080
          </span>
        </div>
        <div className="text-[11px] text-[#64748d] dark:text-[#94a3b8] font-mono">
          P95:{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            11.4ms
          </span>
        </div>
      </div>

      {/* Table with clean responsive column styling */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs min-w-full">
          <thead>
            <tr className="border-b border-[#e2e8f0] dark:border-white/10 text-[10px] uppercase tracking-wider text-[#64748d] dark:text-[#94a3b8] bg-[#fafbfc]/50 dark:bg-white/[0.02]">
              <th className="px-4 py-2 font-medium">Transaction</th>
              <th className="px-3 py-2 font-medium">Rail</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="hidden sm:table-cell px-3 py-2 font-medium">Latency</th>
              <th className="px-4 py-2 text-right sm:text-left font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9] dark:divide-white/5">
            {transactions.map((t, idx) => (
              <tr
                key={t.id}
                className={`transition-colors duration-150 ${
                  activeRow === idx
                    ? "bg-[#eef2ff]/70 dark:bg-[#4f46e5]/10"
                    : "hover:bg-[#f8fafc] dark:hover:bg-white/5"
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-[#4f46e5] dark:text-[#818cf8] font-medium text-xs">
                  {t.id}
                </td>
                <td className="px-3 py-2.5 text-[#334155] dark:text-[#cbd5e1] text-xs">{t.rail}</td>
                <td className="px-3 py-2.5 text-[#0f172a] dark:text-white tabular-nums font-medium text-xs whitespace-nowrap">
                  {t.amount}
                </td>
                <td className="hidden sm:table-cell px-3 py-2.5 text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
                  {t.latency}
                </td>
                <td className="px-4 py-2.5 text-right sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                      t.statusColor === "emerald"
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                        : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{t.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * 3. ZeroKnowledgeSecurityMockup:
 * Clean, light-mode visual TLS Header Inspector showing Zero Credential Persistence to disk or DB.
 */
export function ZeroKnowledgeSecurityMockup() {
  return (
    <div className="w-full rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f1426] p-4 sm:p-5 shadow-xs transition-all">
      {/* Clean Mac-style Inspector Header */}
      <div className="mb-3.5 flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
            <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
          </div>
          <span className="text-xs font-mono font-medium text-[#0f172a] dark:text-white ml-1.5">
            TLS 1.3 Ingress Headers
          </span>
        </div>
        <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          Invariant I3 Verified
        </span>
      </div>

      {/* Clean, light key-value rows */}
      <div className="space-y-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#fafbfc] dark:bg-[#141b33] p-2.5 border border-[#e2e8f0] dark:border-white/5 gap-1">
          <span className="font-mono text-[#4f46e5] dark:text-[#818cf8] text-[11px] font-medium">
            X-Paymob-Api-Key
          </span>
          <span className="text-[#64748d] dark:text-[#94a3b8] font-mono text-[11px]">
            sec_live_•••••••••••• (Transient TLS only)
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#fafbfc] dark:bg-[#141b33] p-2.5 border border-[#e2e8f0] dark:border-white/5 gap-1">
          <span className="font-mono text-[#4f46e5] dark:text-[#818cf8] text-[11px] font-medium">
            X-Fawry-Secret
          </span>
          <span className="text-[#64748d] dark:text-[#94a3b8] font-mono text-[11px]">
            faw_sec_•••••••••••• (Never written to DB)
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-[#fafbfc] dark:bg-[#141b33] p-2.5 border border-[#e2e8f0] dark:border-white/5 gap-1">
          <span className="font-mono text-[#4f46e5] dark:text-[#818cf8] text-[11px] font-medium">
            Idempotency-Key
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
            idemp_2026_9a4b81c (SHA-256 locked)
          </span>
        </div>
      </div>

      {/* Minimalist Summary Footer */}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#e2e8f0] dark:border-white/10 pt-3 text-[11px] text-[#64748d] dark:text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <Lock
            className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
          />
          <span>RAM-only transit memory</span>
        </span>
        <span className="text-emerald-700 dark:text-emerald-400 font-medium">0 Secrets Stored</span>
      </div>
    </div>
  )
}

/**
 * 4. SovereignCardMockup:
 * Clean, light-mode Precision Sovereign Currency & Meeza clearing inspector with strict integer minor units.
 */
export function SovereignCardMockup() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f1426] p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 transition-all">
      {/* Light, Clean Meeza Scheme Card */}
      <div className="rounded-xl bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] dark:from-[#1a2035] dark:via-[#151b2e] dark:to-[#0f1426] p-4 flex flex-col justify-between aspect-[1.7] border border-[#cbd5e1] dark:border-white/10 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[#4f46e5]/10 dark:bg-[#4f46e5]/30 border border-[#4f46e5]/30 flex items-center justify-center">
              <Zap
                className="w-3.5 h-3.5 text-[#4f46e5] dark:text-[#818cf8]"
              />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-[#334155] dark:text-white/80">
              Central Bank of Egypt
            </span>
          </div>
          <span className="text-[10px] font-medium text-[#475569] dark:text-white/90">
            Sovereign Rail
          </span>
        </div>

        <div className="font-mono text-sm tracking-widest text-[#0f172a] dark:text-white font-medium">
          5078 0300 0000 0001
        </div>

        <div className="flex items-end justify-between text-[10px]">
          <div>
            <span className="text-[#64748d] dark:text-[#94a3b8] block text-[9px]">Card Scheme</span>
            <span className="font-semibold text-[#0f172a] dark:text-white">
              Meeza National Debit
            </span>
          </div>
          <div className="text-right">
            <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[9px] block">
              EGP Minor Units
            </span>
            <span className="font-bold text-[#0f172a] dark:text-white tracking-wider">
              ميزة MEEZA
            </span>
          </div>
        </div>
      </div>

      {/* Integer Minor Unit Math Breakdown */}
      <div className="rounded-lg bg-[#fafbfc] dark:bg-[#141b33]/60 border border-[#e2e8f0] dark:border-white/10 p-3 flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between text-[#64748d] dark:text-[#94a3b8]">
          <span>Display Amount</span>
          <span className="font-medium text-[#0f172a] dark:text-white tabular-nums">
            250.00 EGP
          </span>
        </div>
        <div className="flex items-center justify-between text-[#64748d] dark:text-[#94a3b8]">
          <span>Engine Minor Units (piasters)</span>
          <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
            25,000 minor (i64)
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e2e8f0] dark:border-white/10 pt-1.5 text-[11px] text-[#64748d] dark:text-[#94a3b8]">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Zero IEEE 754 float drift</span>
          </span>
          <span className="font-mono text-[#64748d] dark:text-[#94a3b8]">Invariant I1</span>
        </div>
      </div>
    </div>
  )
}
