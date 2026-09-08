"use client"

import { ArrowRight, CheckCircle2, Cpu, Database, Lock, ShieldCheck, Zap } from "lucide-react"
import { motion, useInView } from "motion/react"
import { useEffect, useRef, useState } from "react"

interface ClientItem {
  id: string
  name: string
  desc: string
  lang: string
}

interface RailItem {
  id: string
  name: string
  sub: string
  badge: string
}

const CLIENTS: ClientItem[] = [
  { id: "ts", name: "TypeScript SDK", desc: "@openwrapper/sdk (Node · Bun)", lang: "TS" },
  { id: "dotnet", name: ".NET 8/9 Client", desc: "Native Source Generation", lang: "C#" },
  { id: "php", name: "PHP 8.1+ PSR-18", desc: "Composer / Laravel Ready", lang: "PHP" },
  { id: "curl", name: "cURL & gRPC", desc: "OpenAPI 3.1 & Protobuf v3", lang: "HTTP" },
]

const ENGINE_MODULES = [
  {
    id: "zk",
    icon: Lock,
    label: "Stateless Ingress",
    badge: "RAM only",
    invariant: "Invariant I3",
    statusText: "Merchant keys in TLS headers only",
  },
  {
    id: "idem",
    icon: ShieldCheck,
    label: "Idempotency Guard",
    badge: "SHA-256",
    invariant: "Invariant I4",
    statusText: "Replay conflict protection enforced",
  },
  {
    id: "math",
    icon: Zap,
    label: "Minor Units Math",
    badge: "i64 integer",
    invariant: "Invariant I1",
    statusText: "Exact piasters · 0.00% float drift",
  },
  {
    id: "store",
    icon: Database,
    label: "Dual Store Parity",
    badge: "Postgres / SQLite",
    invariant: "Invariant I7",
    statusText: "Atomic state machine synchronization",
  },
]

const RAILS: RailItem[] = [
  {
    id: "paymob",
    name: "Paymob Gateway",
    sub: "Cards · Meeza · Wallets",
    badge: "EGP / SAR",
  },
  {
    id: "fawry",
    name: "Fawry Retail POS",
    sub: "180,000+ Kiosks",
    badge: "Cash Code",
  },
  {
    id: "wallets",
    name: "Mobile Wallets",
    sub: "Vodafone · Orange · Etisalat",
    badge: "Push OTP",
  },
  {
    id: "stripe",
    name: "Stripe & Global",
    sub: "Cards · Apple Pay · 3DS",
    badge: "USD / EUR",
  },
]

export function TransactionFlowDiagram() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: "100px", once: false })

  const [activeClientIdx, setActiveClientIdx] = useState(0)
  const [activeRailIdx, setActiveRailIdx] = useState(0)
  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [pipelinePhase, setPipelinePhase] = useState<
    "ingress" | "engine" | "dispatch" | "delivered"
  >("ingress")

  // Viewport-gated interval: pauses when scrolled off-screen to guarantee 60fps
  useEffect(() => {
    if (!isInView) return

    const timer = setInterval(() => {
      setPipelinePhase((prev) => {
        if (prev === "ingress") {
          setActiveModuleIdx(0)
          return "engine"
        }
        if (prev === "engine") {
          return "dispatch"
        }
        if (prev === "dispatch") {
          return "delivered"
        }
        setActiveClientIdx((c) => (c + 1) % CLIENTS.length)
        setActiveRailIdx((r) => (r + 1) % RAILS.length)
        return "ingress"
      })
    }, 2400)

    return () => clearInterval(timer)
  }, [isInView])

  useEffect(() => {
    if (!isInView || pipelinePhase !== "engine") return

    const subTimer = setInterval(() => {
      setActiveModuleIdx((m) => (m + 1) % ENGINE_MODULES.length)
    }, 500)

    return () => clearInterval(subTimer)
  }, [isInView, pipelinePhase])

  const activeClient = CLIENTS[activeClientIdx]
  const activeRail = RAILS[activeRailIdx]

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl border border-border bg-card stripe-card-shadow-sm overflow-hidden transition-all"
    >
      {/* 1. Clean Minimalist Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 sm:px-8 py-3.5 text-xs select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-medium text-foreground text-xs">Live Wire Pipeline</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground text-xs font-mono truncate">
            {pipelinePhase === "ingress" && `Ingress: ${activeClient.name} (TLS 1.3)`}
            {pipelinePhase === "engine" &&
              `Core: ${ENGINE_MODULES[activeModuleIdx].label} (${ENGINE_MODULES[activeModuleIdx].invariant})`}
            {pipelinePhase === "dispatch" && `Outbound: Forwarding to ${activeRail.name}`}
            {pipelinePhase === "delivered" && `Settlement: ${activeRail.name} · State [Successful]`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="rounded-md bg-card border border-border px-2.5 py-0.5 text-foreground font-medium font-tnum">
            P95: <span className="text-emerald-600 dark:text-emerald-400">7.8ms</span>
          </span>
          <span className="hidden sm:inline-block text-muted-foreground">
            Zero-Knowledge Transit
          </span>
        </div>
      </div>

      {/* 2. Pipeline Subheader */}
      <div className="px-5 sm:px-8 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
        <div>
          <h3 className="text-lg sm:text-xl font-normal tracking-tight text-foreground">
            End-to-end request lifecycle
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-light">
            Unified state transitions across regional Egyptian rails and global processors.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
            <Cpu className="w-3 h-3" />
            <span>Axum 0.7 Engine</span>
          </span>
        </div>
      </div>

      {/* 3. Three-Column Minimalist Flow Grid */}
      <div className="grid gap-6 lg:grid-cols-[3fr_auto_4fr_auto_3fr] items-stretch p-5 sm:p-8 bg-secondary/40">
        {/* Tier 1: Client Applications */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-medium text-muted-foreground">
            <span className="tracking-wide text-[11px] uppercase font-mono">1. Client Ingress</span>
            <span className="text-[11px] font-mono text-primary">REST · gRPC</span>
          </div>

          <div className="flex flex-col gap-2">
            {CLIENTS.map((c, idx) => {
              const isSelected = activeClientIdx === idx
              return (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setActiveClientIdx(idx)}
                  className={`cursor-pointer text-left flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-card stripe-card-shadow-xs text-foreground ring-1 ring-primary/30"
                      : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-light">
                      {c.desc}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-medium">
                    {c.lang}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Conduit 1: Client -> Gateway */}
        <div className="hidden lg:flex flex-col items-center justify-center px-1 w-16 shrink-0 text-muted-foreground">
          <span className="font-mono text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">
            TLS 1.3
          </span>
          <div className="w-full flex items-center justify-center">
            <svg viewBox="0 0 64 12" className="w-full h-3" fill="none">
              <line
                x1="0"
                y1="6"
                x2="64"
                y2="6"
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {pipelinePhase === "ingress" && (
                <motion.line
                  x1="0"
                  y1="6"
                  x2="64"
                  y2="6"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [-16, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
              )}
            </svg>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground mt-1" />
        </div>

        {/* Tier 2: OpenWrapper Core Gateway */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between stripe-card-shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  OW
                </div>
                <span className="text-xs font-medium text-foreground">Gateway Core Engine</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Tokio Async
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {ENGINE_MODULES.map((m, idx) => {
                const isActive = pipelinePhase === "engine" && activeModuleIdx === idx
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-lg p-2.5 border transition-all text-xs ${
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-medium"
                        : "border-border/50 bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const IconComp = m.icon
                        return (
                          <IconComp
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                        )
                      })()}
                      <span className="text-xs truncate">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                        {m.invariant}
                      </span>
                      <span className="font-mono text-[10px] bg-card border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                        {m.badge}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Ledger Integrity</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Deterministic Parity OK
            </span>
          </div>
        </div>

        {/* Conduit 2: Gateway -> Upstream Rails */}
        <div className="hidden lg:flex flex-col items-center justify-center px-1 w-16 shrink-0 text-muted-foreground">
          <span className="font-mono text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">
            Dispatch
          </span>
          <div className="w-full flex items-center justify-center">
            <svg viewBox="0 0 64 12" className="w-full h-3" fill="none">
              <line
                x1="0"
                y1="6"
                x2="64"
                y2="6"
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {pipelinePhase === "dispatch" && (
                <motion.line
                  x1="0"
                  y1="6"
                  x2="64"
                  y2="6"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [-16, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
              )}
            </svg>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground mt-1" />
        </div>

        {/* Tier 3: Upstream Rails */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-medium text-muted-foreground">
            <span className="tracking-wide text-[11px] uppercase font-mono">3. Upstream Rails</span>
            <span className="text-[11px] font-mono text-muted-foreground">Outbound TLS</span>
          </div>

          <div className="flex flex-col gap-2">
            {RAILS.map((r, idx) => {
              const isSelected = activeRailIdx === idx
              return (
                <button
                  type="button"
                  key={r.name}
                  onClick={() => setActiveRailIdx(idx)}
                  className={`cursor-pointer text-left flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-card stripe-card-shadow-xs text-foreground ring-1 ring-primary/30"
                      : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-light">
                      {r.sub}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-medium">
                    {r.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Minimalist Footer Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-border bg-muted/40 px-5 sm:px-8 py-3 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Invariant I1: Zero floating-point drift (i64 minor units)</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
          <span>Connect: 10s timeout</span>
          <span>·</span>
          <span>Read: 30s timeout</span>
          <span>·</span>
          <span className="text-foreground font-medium">100% Rust & TypeScript</span>
        </div>
      </div>
    </div>
  )
}

export const ArchitectureFlow = TransactionFlowDiagram
export default TransactionFlowDiagram
