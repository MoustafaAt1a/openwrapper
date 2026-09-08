"use client"

import { Check, CheckCircle2, Clock, CreditCard, Lock, ShieldAlert, Smartphone, Store, Zap } from "lucide-react"
import { useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { GooTabs, useSlidingIndicator } from "@/components/ui/goo-tabs"
import { cn } from "@/lib/utils"

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
        fullWidth
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
 * Edge-to-edge live transaction ledger stream & monotonic state transitions.
 * Full width utilization, high-density monospace telemetry with sliding vertical goo indicator.
 */
export function LedgerTelemetryMockup() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: "50px", once: false })

  const transitions = [
    {
      id: "tx_01hr9q7k",
      step: "01",
      state: "Initiated",
      rail: "Paymob (Meeza)",
      amount: "250.00 EGP",
      latency: "1.2ms",
      statusColor: "sky",
      detail: "SHA-256 idempotency key locked · Ingress validated",
    },
    {
      id: "tx_01hr9q5a",
      step: "02",
      state: "Pending",
      rail: "Fawry Kiosk",
      amount: "1,200.00 EGP",
      latency: "14.1ms",
      statusColor: "amber",
      detail: "Upstream rail dispatching · Reference generated",
    },
    {
      id: "tx_01hr9q2e",
      step: "03",
      state: "RequiresAction",
      rail: "Stripe 3DS",
      amount: "49.00 USD",
      latency: "28.5ms",
      statusColor: "purple",
      detail: "3DS 2.0 biometric challenge verification active",
    },
    {
      id: "tx_01hr9py8",
      step: "04",
      state: "Successful",
      rail: "Vodafone Cash",
      amount: "450.00 EGP",
      latency: "11.7ms",
      statusColor: "emerald",
      detail: "Terminal state reached · Immutable ledger committed",
    },
  ]

  const [activeRow, setActiveRow] = useState(0)
  const activeItem = transitions[activeRow]

  const {
    containerRef: rowsContainerRef,
    indicatorStyle: rowIndicatorStyle,
    setRef: setRowRef,
  } = useSlidingIndicator(activeItem.id)

  useEffect(() => {
    if (!isInView) return

    const timer = setInterval(() => {
      setActiveRow((prev) => (prev + 1) % transitions.length)
    }, 2800)

    return () => clearInterval(timer)
  }, [isInView, transitions.length])

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

      {/* Table with clean responsive column styling and vertical sliding goo indicator */}
      <div className="w-full rounded-lg border border-border/70 bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1.1fr_1.3fr_1.1fr_auto] sm:grid-cols-[1.1fr_1.3fr_1.1fr_0.8fr_1.2fr] items-center px-3 py-1.5 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40 font-mono">
          <span className="font-medium">Tx ID</span>
          <span className="font-medium">Rail</span>
          <span className="font-medium">Amount</span>
          <span className="hidden sm:inline font-medium">Latency</span>
          <span className="font-medium text-right">Status</span>
        </div>

        {/* Rows with vertical sliding indicator */}
        <div
          ref={rowsContainerRef}
          className="relative flex flex-col p-1 gap-0.5 text-[11px] font-mono"
        >
          {/* Sliding Goo Indicator behind active Row */}
          <div
            className="absolute rounded-md border border-primary/40 bg-primary/10 dark:bg-primary/20 stripe-card-shadow-xs pointer-events-none z-0"
            style={rowIndicatorStyle}
            aria-hidden="true"
          />

          {transitions.map((t, idx) => {
            const isSelected = activeRow === idx
            return (
              <button
                type="button"
                key={t.id}
                ref={setRowRef(t.id) as React.Ref<HTMLButtonElement>}
                onClick={() => setActiveRow(idx)}
                className={cn(
                  "relative z-10 w-full text-left grid grid-cols-[1.1fr_1.3fr_1.1fr_auto] sm:grid-cols-[1.1fr_1.3fr_1.1fr_0.8fr_1.2fr] items-center px-2.5 py-2 cursor-pointer transition-colors duration-150 rounded-md",
                  isSelected
                    ? "text-foreground font-medium"
                    : "text-foreground/80 hover:bg-secondary/30",
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0 transition-colors duration-200",
                      isSelected ? "bg-primary animate-pulse" : "bg-muted-foreground/30",
                    )}
                  />
                  <span className="text-primary font-medium truncate">{t.id}</span>
                </div>
                <div className="truncate text-foreground/80 pr-1">{t.rail}</div>
                <div className="text-foreground font-medium truncate pr-1">{t.amount}</div>
                <div className="hidden sm:inline text-emerald-600 dark:text-emerald-400">
                  {t.latency}
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                      t.statusColor === "emerald" &&
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      t.statusColor === "amber" &&
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      t.statusColor === "sky" &&
                        "bg-sky-500/15 text-sky-600 dark:text-sky-400",
                      t.statusColor === "purple" &&
                        "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                    )}
                  >
                    {t.statusColor === "emerald" && <Check className="size-2.5" />}
                    {t.statusColor === "amber" && <Clock className="size-2.5" />}
                    {t.statusColor === "sky" && <ShieldAlert className="size-2.5" />}
                    {t.statusColor === "purple" && <Zap className="size-2.5" />}
                    <span>{t.state}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dynamic Telemetry Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <span className="truncate pr-2">{activeItem.detail}</span>
        <span className="font-mono text-[10px] shrink-0 text-primary font-medium">
          Step {activeItem.step}/04
        </span>
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
