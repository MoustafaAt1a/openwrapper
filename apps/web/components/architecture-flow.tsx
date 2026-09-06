"use client"

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  CpuIcon,
  Database01Icon,
  LockIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
    icon: LockIcon,
    label: "Stateless Ingress",
    badge: "RAM only",
    invariant: "Invariant I3",
    statusText: "Merchant keys in TLS headers only",
  },
  {
    id: "idem",
    icon: ShieldCheckIcon,
    label: "Idempotency Guard",
    badge: "SHA-256",
    invariant: "Invariant I4",
    statusText: "Replay conflict protection enforced",
  },
  {
    id: "math",
    icon: ZapIcon,
    label: "Minor Units Math",
    badge: "i64 integer",
    invariant: "Invariant I1",
    statusText: "Exact piasters · 0.00% float drift",
  },
  {
    id: "store",
    icon: Database01Icon,
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

export function ArchitectureFlow() {
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
      className="w-full rounded-2xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f1426] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
    >
      {/* 1. Clean Minimalist Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/40 px-5 sm:px-8 py-3.5 text-xs select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-medium text-[#0f172a] dark:text-white text-xs">
            Live Wire Pipeline
          </span>
          <span className="text-[#cbd5e1] dark:text-[#334155]">|</span>
          <span className="text-[#64748d] dark:text-[#94a3b8] text-xs font-mono truncate">
            {pipelinePhase === "ingress" && `Ingress: ${activeClient.name} (TLS 1.3)`}
            {pipelinePhase === "engine" &&
              `Core: ${ENGINE_MODULES[activeModuleIdx].label} (${ENGINE_MODULES[activeModuleIdx].invariant})`}
            {pipelinePhase === "dispatch" && `Outbound: Forwarding to ${activeRail.name}`}
            {pipelinePhase === "delivered" && `Settlement: ${activeRail.name} · State [Successful]`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#64748d] dark:text-[#94a3b8]">
          <span className="rounded-md bg-white dark:bg-white/5 border border-[#e2e8f0] dark:border-white/10 px-2.5 py-0.5 text-[#0f172a] dark:text-white font-medium tabular-nums">
            P95: <span className="text-emerald-600 dark:text-emerald-400">7.8ms</span>
          </span>
          <span className="hidden sm:inline-block text-[#94a3b8]">Zero-Knowledge Transit</span>
        </div>
      </div>

      {/* 2. Pipeline Subheader */}
      <div className="px-5 sm:px-8 py-5 border-b border-[#e2e8f0] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1426]">
        <div>
          <h3 className="text-lg sm:text-xl font-normal tracking-tight text-[#0f172a] dark:text-white">
            End-to-end request lifecycle
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#64748d] dark:text-[#94a3b8] font-light">
            Unified state transitions across regional Egyptian rails and global processors.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#4f46e5] dark:text-[#818cf8] bg-[#eef2ff] dark:bg-[#4f46e5]/10 px-2.5 py-1 rounded-md border border-[#e0e7ff] dark:border-[#4f46e5]/20">
            <HugeiconsIcon icon={CpuIcon} size={12} />
            <span>Axum 0.7 Engine</span>
          </span>
        </div>
      </div>

      {/* 3. Three-Column Minimalist Flow Grid */}
      <div className="grid gap-6 lg:grid-cols-[3fr_auto_4fr_auto_3fr] items-stretch p-5 sm:p-8 bg-[#fafbfc]/50 dark:bg-[#0b0e1b]/40">
        {/* Tier 1: Client Applications */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-white/10 text-xs font-medium text-[#475569] dark:text-[#94a3b8]">
            <span className="tracking-wide text-[11px] uppercase font-mono">1. Client Ingress</span>
            <span className="text-[11px] font-mono text-[#4f46e5] dark:text-[#818cf8]">
              REST · gRPC
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {CLIENTS.map((c, idx) => {
              const isSelected = activeClientIdx === idx
              return (
                <div
                  key={c.name}
                  onClick={() => setActiveClientIdx(idx)}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-[#4f46e5] bg-white dark:bg-[#1a2035] shadow-xs text-[#0f172a] dark:text-white ring-1 ring-[#4f46e5]/30"
                      : "border-[#e2e8f0] dark:border-white/5 bg-white dark:bg-[#141a2e] text-[#334155] dark:text-[#cbd5e1] hover:border-[#cbd5e1] dark:hover:border-white/15"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748d] dark:text-[#94a3b8] truncate mt-0.5 font-light">
                      {c.desc}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#f1f5f9] dark:bg-white/5 border border-[#e2e8f0] dark:border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#475569] dark:text-[#cbd5e1] font-medium">
                    {c.lang}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conduit 1: Client -> Gateway */}
        <div className="hidden lg:flex flex-col items-center justify-center px-1 w-16 shrink-0 text-[#94a3b8]">
          <span className="font-mono text-[9px] uppercase tracking-wider mb-1 text-[#64748d]">
            TLS 1.3
          </span>
          <div className="w-full flex items-center justify-center">
            <svg viewBox="0 0 64 12" className="w-full h-3" fill="none">
              <line
                x1="0"
                y1="6"
                x2="64"
                y2="6"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {pipelinePhase === "ingress" && (
                <motion.line
                  x1="0"
                  y1="6"
                  x2="64"
                  y2="6"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [-16, 0] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
              )}
            </svg>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-[#94a3b8] mt-1" />
        </div>

        {/* Tier 2: OpenWrapper Core Gateway */}
        <div className="rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#141a2e] p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-[#4f46e5] text-white flex items-center justify-center text-xs font-semibold">
                  OW
                </div>
                <span className="text-xs font-medium text-[#0f172a] dark:text-white">
                  Gateway Core Engine
                </span>
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
                        ? "border-[#4f46e5] bg-[#eef2ff] dark:bg-[#4f46e5]/15 text-[#1e1b4b] dark:text-white font-medium"
                        : "border-[#f1f5f9] dark:border-white/5 bg-[#fafbfc] dark:bg-white/[0.02] text-[#475569] dark:text-[#94a3b8]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <HugeiconsIcon
                        icon={m.icon}
                        size={14}
                        className={
                          isActive ? "text-[#4f46e5] dark:text-[#818cf8]" : "text-[#94a3b8]"
                        }
                      />
                      <span className="text-xs truncate">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-[#64748d] dark:text-[#94a3b8] hidden sm:inline">
                        {m.invariant}
                      </span>
                      <span className="font-mono text-[10px] bg-white dark:bg-white/10 border border-[#e2e8f0] dark:border-white/10 px-1.5 py-0.5 rounded text-[#475569] dark:text-[#cbd5e1]">
                        {m.badge}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] dark:border-white/10 mt-3 flex items-center justify-between text-[11px] font-mono text-[#64748d] dark:text-[#94a3b8]">
            <span>Ledger Integrity</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Deterministic Parity OK
            </span>
          </div>
        </div>

        {/* Conduit 2: Gateway -> Upstream Rails */}
        <div className="hidden lg:flex flex-col items-center justify-center px-1 w-16 shrink-0 text-[#94a3b8]">
          <span className="font-mono text-[9px] uppercase tracking-wider mb-1 text-[#64748d]">
            Dispatch
          </span>
          <div className="w-full flex items-center justify-center">
            <svg viewBox="0 0 64 12" className="w-full h-3" fill="none">
              <line
                x1="0"
                y1="6"
                x2="64"
                y2="6"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {pipelinePhase === "dispatch" && (
                <motion.line
                  x1="0"
                  y1="6"
                  x2="64"
                  y2="6"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [-16, 0] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
              )}
            </svg>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="text-[#94a3b8] mt-1" />
        </div>

        {/* Tier 3: Upstream Rails */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-white/10 text-xs font-medium text-[#475569] dark:text-[#94a3b8]">
            <span className="tracking-wide text-[11px] uppercase font-mono">3. Upstream Rails</span>
            <span className="text-[11px] font-mono text-[#64748d]">Outbound TLS</span>
          </div>

          <div className="flex flex-col gap-2">
            {RAILS.map((r, idx) => {
              const isSelected = activeRailIdx === idx
              return (
                <div
                  key={r.name}
                  onClick={() => setActiveRailIdx(idx)}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-[#4f46e5] bg-white dark:bg-[#1a2035] shadow-xs text-[#0f172a] dark:text-white ring-1 ring-[#4f46e5]/30"
                      : "border-[#e2e8f0] dark:border-white/5 bg-white dark:bg-[#141a2e] text-[#334155] dark:text-[#cbd5e1] hover:border-[#cbd5e1] dark:hover:border-white/15"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748d] dark:text-[#94a3b8] truncate mt-0.5 font-light">
                      {r.sub}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#f1f5f9] dark:bg-white/5 border border-[#e2e8f0] dark:border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#475569] dark:text-[#cbd5e1] font-medium">
                    {r.badge}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Minimalist Footer Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-[#e2e8f0] dark:border-white/10 bg-[#fafbfc] dark:bg-[#141b33]/40 px-5 sm:px-8 py-3 text-[11px] font-mono text-[#64748d] dark:text-[#94a3b8]">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={14}
            className="text-emerald-500 shrink-0"
          />
          <span>Invariant I1: Zero floating-point drift (i64 minor units)</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[#94a3b8]">
          <span>Connect: 10s timeout</span>
          <span>·</span>
          <span>Read: 30s timeout</span>
          <span>·</span>
          <span className="text-[#0f172a] dark:text-white font-medium">100% Rust & TypeScript</span>
        </div>
      </div>
    </div>
  )
}
