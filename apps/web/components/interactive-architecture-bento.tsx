"use client"

import { Check, CheckCircle2, CreditCard, Lock, Smartphone, Store, Zap } from "lucide-react"
import { useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { GooTabs } from "@/components/ui/goo-tabs"

/**
 * 1. MobileCheckoutMockup:
 * Clean, full-width MENA multi-rail routing preview (Meeza, Wallets, Fawry).
 * No nested card-in-card containers; fills available space with crisp interactive controls.
 */
export function MobileCheckoutMockup() {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | "fawry">("card")

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Context Top Bar */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Cairo Artisan Roasters</span>
          <span className="text-muted-foreground font-mono text-[11px]">#OW-9281</span>
        </div>
        <div className="font-mono text-foreground font-medium text-xs">250.00 EGP</div>
      </div>

      {/* Method Selector Tabs — Sliding Indicator */}
      <GooTabs
        items={[
          {
            id: "card",
            label: (
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Meeza Card</span>
              </span>
            ),
          },
          {
            id: "wallet",
            label: (
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Wallet</span>
              </span>
            ),
          },
          {
            id: "fawry",
            label: (
              <span className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>Fawry Kiosk</span>
              </span>
            ),
          },
        ]}
        activeId={selectedMethod}
        onTabChange={(id) => setSelectedMethod(id as typeof selectedMethod)}
        className="w-full bg-secondary/80 border border-border/60"
        indicatorClassName="bg-card text-foreground shadow-xs"
        activeTabClassName="text-foreground"
        size="sm"
      />

      {/* Dynamic Panel Content */}
      <div className="rounded-lg border border-border/70 bg-card p-3 min-h-[96px] flex flex-col justify-center">
        {selectedMethod === "card" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-foreground font-medium tracking-wide">
                5078 0300 0000 0001
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                MEEZA DEBIT · 3DS 2.0
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/50">
              <span>EXP: 12 / 28</span>
              <span>CVV: •••</span>
              <span className="text-foreground">Sovereign Rail</span>
            </div>
          </div>
        )}

        {selectedMethod === "wallet" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-foreground font-medium">+20 10 1234 5678</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
                VODAFONE CASH
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Instant USSD authorization push dispatched to subscriber phone.
            </p>
          </div>
        )}

        {selectedMethod === "fawry" && (
          <div className="flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">Reference Number</span>
              <span className="font-mono text-base font-bold text-foreground tracking-wider">
                9482 9104
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-right">
              Valid 48h · 180,000+ Kiosks
            </span>
          </div>
        )}
      </div>

      {/* Security Status Bar */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
          <span>Stateless Zero-Knowledge Ingress</span>
        </span>
        <span className="font-mono text-[10px]">TLS 1.3</span>
      </div>
    </div>
  )
}

/**
 * 2. LedgerTelemetryMockup:
 * Edge-to-edge live transaction ledger stream.
 * Full width utilization, no double borders, high-density monospace telemetry.
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
    <div ref={containerRef} className="w-full flex flex-col gap-2.5">
      {/* Header telemetry bar */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Live Gateway Ledger</span>
          <span className="font-mono text-[10px] text-muted-foreground">Axum :8080</span>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground">
          p95: <span className="font-semibold text-emerald-600 dark:text-emerald-400">11.4ms</span>
        </div>
      </div>

      {/* Table with clean responsive column styling */}
      <div className="overflow-x-auto w-full rounded-lg border border-border/70 bg-card">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40 font-mono">
              <th className="px-3 py-1.5 font-medium">Tx ID</th>
              <th className="px-2.5 py-1.5 font-medium">Rail</th>
              <th className="px-2.5 py-1.5 font-medium">Amount</th>
              <th className="hidden sm:table-cell px-2.5 py-1.5 font-medium">Latency</th>
              <th className="px-3 py-1.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-[11px] font-mono">
            {transactions.map((t, idx) => (
              <tr
                key={t.id}
                className={`transition-colors duration-150 ${
                  activeRow === idx ? "bg-primary/10" : "hover:bg-secondary/30"
                }`}
              >
                <td className="px-3 py-2 text-primary font-medium">{t.id}</td>
                <td className="px-2.5 py-2 text-foreground/80">{t.rail}</td>
                <td className="px-2.5 py-2 text-foreground font-medium">{t.amount}</td>
                <td className="hidden sm:table-cell px-2.5 py-2 text-emerald-600 dark:text-emerald-400">
                  {t.latency}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                      t.statusColor === "emerald"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <Check className="size-2.5" />
                    <span>{t.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span>Deterministic monotonic state machine</span>
        <span className="font-mono text-[10px]">Idempotency Guarded</span>
      </div>
    </div>
  )
}

/**
 * 3. ZeroKnowledgeSecurityMockup:
 * High-density TLS Header & Transient Secret Inspector.
 * Clean, minimal, no fake traffic light decorations.
 */
export function ZeroKnowledgeSecurityMockup() {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-mono font-medium text-foreground">TLS 1.3 Ingress Headers</span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
          Invariant I3 Verified
        </span>
      </div>

      {/* Key-Value Header Rows */}
      <div className="space-y-1.5 rounded-lg border border-border/70 bg-card p-3 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40">
          <span className="text-primary font-medium text-[11px]">X-Paymob-Api-Key</span>
          <span className="text-muted-foreground text-[11px]">
            sec_live_••••••••••••{" "}
            <span className="text-emerald-600 dark:text-emerald-400">(RAM only)</span>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40">
          <span className="text-primary font-medium text-[11px]">X-Fawry-Secret</span>
          <span className="text-muted-foreground text-[11px]">
            faw_sec_••••••••••••{" "}
            <span className="text-emerald-600 dark:text-emerald-400">(Zero disk I/O)</span>
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
          <span className="text-primary font-medium text-[11px]">Idempotency-Key</span>
          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
            idemp_2026_9a4b81c <span className="text-muted-foreground">(SHA-256 locked)</span>
          </span>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span>RAM-only transit memory</span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          0 Secrets Stored in Database
        </span>
      </div>
    </div>
  )
}

/**
 * 4. SovereignCardMockup:
 * Discrete Integer Minor Units (Invariant I1).
 * Clear comparison between IEEE 754 float drift and exact integer minor units.
 */
export function SovereignCardMockup() {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-primary" />
          <span className="font-mono font-medium text-foreground">
            Discrete Integer Units (i64)
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
          Invariant I1 Enforced
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid sm:grid-cols-2 gap-2 rounded-lg border border-border/70 bg-card p-3 text-xs">
        {/* Float 64 Problem */}
        <div className="flex flex-col gap-1 p-2 rounded bg-destructive/5 border border-destructive/20 font-mono">
          <div className="flex items-center justify-between text-[10px] text-destructive font-semibold">
            <span>IEEE 754 Floating-Point</span>
            <span>❌ Drift</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            0.1 + 0.2 = <span className="text-destructive">0.30000000000000004</span>
          </div>
          <div className="text-[10px] text-muted-foreground/80">Unsafe for financial ledgers</div>
        </div>

        {/* Integer Minor Units Solution */}
        <div className="flex flex-col gap-1 p-2 rounded bg-emerald-500/5 border border-emerald-500/20 font-mono">
          <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>OpenWrapper Discrete i64</span>
            <span>✓ Exact</span>
          </div>
          <div className="text-[11px] text-foreground mt-0.5">
            10 + 20 ={" "}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">30 minor units</span>
          </div>
          <div className="text-[10px] text-muted-foreground/80">Zero floating-point error</div>
        </div>
      </div>

      {/* Canonical Translation Row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
        <span>Display: 250.00 EGP</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
          amount_minor_units: 25,000 (piasters)
        </span>
      </div>
    </div>
  )
}
