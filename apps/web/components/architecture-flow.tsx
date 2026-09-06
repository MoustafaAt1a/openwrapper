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
import { motion } from "motion/react"
import { useEffect, useState } from "react"

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
  { id: "ts", name: "TypeScript SDK", desc: "@openwrapper/sdk (Bun · Node)", lang: "TS" },
  { id: "dotnet", name: ".NET 8 / 9 Client", desc: "System.Text.Json SourceGen", lang: "C#" },
  { id: "php", name: "PHP 8.1+ PSR-18", desc: "Composer / Laravel Ready", lang: "PHP" },
  { id: "curl", name: "Direct cURL & gRPC", desc: "OpenAPI 3.1 & Protobuf v3", lang: "HTTP/2" },
]

const ENGINE_MODULES = [
  {
    id: "zk",
    icon: LockIcon,
    label: "Stateless zero-knowledge",
    badge: "RAM only",
    invariant: "Invariant I3",
    statusText: "Credentials ephemeral in TLS stream",
  },
  {
    id: "idem",
    icon: ShieldCheckIcon,
    label: "Idempotency guard",
    badge: "SHA-256",
    invariant: "Invariant I4",
    statusText: "Replay conflict protection enforced",
  },
  {
    id: "math",
    icon: ZapIcon,
    label: "Minor units math core",
    badge: "i64 integer",
    invariant: "Invariant I1",
    statusText: "Exact piasters · 0.00% float drift",
  },
  {
    id: "store",
    icon: Database01Icon,
    label: "Dual store parity",
    badge: "Postgres / SQLite",
    invariant: "Invariant I7",
    statusText: "Atomic state machine synchronization",
  },
]

const RAILS: RailItem[] = [
  {
    id: "paymob",
    name: "Paymob Gateway",
    sub: "Meeza · 3DS Cards · Wallets",
    badge: "EGP / SAR / AED",
  },
  {
    id: "fawry",
    name: "Fawry Retail POS",
    sub: "180,000+ Physical Kiosks",
    badge: "8-digit Cash Ref",
  },
  {
    id: "wallets",
    name: "Mobile Wallets",
    sub: "Vodafone · Orange · Etisalat",
    badge: "Push OTP / USSD",
  },
  {
    id: "stripe",
    name: "Stripe & Global",
    sub: "Apple Pay · Intl Cards · 3DS 2.0",
    badge: "USD / EUR / Global",
  },
]

function PipelineConduit({
  direction = "horizontal",
  label,
  sublabel,
  isActive = false,
}: {
  direction?: "horizontal" | "vertical"
  label: string
  sublabel?: string
  isActive?: boolean
}) {
  if (direction === "vertical") {
    return (
      <div className="flex flex-col items-center justify-center py-2 lg:hidden">
        <div className="relative h-6 w-px bg-white/10 overflow-hidden">
          <motion.div
            animate={{ y: [-24, 24] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-transparent via-[#533afd] to-transparent"
          />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#8ca3ba] mt-0.5">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex flex-col items-center justify-center px-1 w-20 shrink-0">
      <span className="font-mono text-[9px] text-[#8ca3ba] uppercase tracking-wider mb-1">
        {label}
      </span>
      <div className="relative w-full h-5 flex items-center justify-center">
        <svg viewBox="0 0 80 16" className="w-full h-4 overflow-visible" fill="none">
          <line
            x1="0"
            y1="8"
            x2="80"
            y2="8"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {isActive && (
            <motion.line
              x1="0"
              y1="8"
              x2="80"
              y2="8"
              stroke="#533afd"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              animate={{ strokeDashoffset: [-16, 0] }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          )}
        </svg>
      </div>
      <div className="flex items-center gap-1 text-[9px] font-mono text-[#8ca3ba]">
        <span>{sublabel}</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={10} className="text-[#8ca3ba]/70" />
      </div>
    </div>
  )
}

export function ArchitectureFlow() {
  const [activeTab, setActiveTab] = useState<"all" | "ingress" | "engine" | "rails">("all")

  // Pipeline Simulation State Machine (Calm, deliberate cycling)
  const [pipelinePhase, setPipelinePhase] = useState<
    "ingress" | "engine" | "dispatch" | "delivered"
  >("ingress")
  const [activeClientIdx, setActiveClientIdx] = useState(0)
  const [activeRailIdx, setActiveRailIdx] = useState(0)
  const [activeModuleIdx, setActiveModuleIdx] = useState(0)

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (pipelinePhase === "engine") {
      const subTimer = setInterval(() => {
        setActiveModuleIdx((m) => (m + 1) % ENGINE_MODULES.length)
      }, 500)
      return () => clearInterval(subTimer)
    }
  }, [pipelinePhase])

  const tabs = [
    { key: "all" as const, label: "End-to-End Pipeline" },
    { key: "ingress" as const, label: "Ingress & Auth" },
    { key: "engine" as const, label: "Gateway Engine" },
    { key: "rails" as const, label: "Sovereign Rails" },
  ]

  const activeClient = CLIENTS[activeClientIdx]
  const activeRail = RAILS[activeRailIdx]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0c1024] text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative"
    >
      {/* Subtle ambient gradient */}
      <div
        className="pointer-events-none absolute -top-24 left-1/3 w-[500px] h-[250px] bg-[#533afd]/10 rounded-full blur-[120px]"
        aria-hidden="true"
      />

      {/* 1. Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#080b18]/90 px-6 sm:px-8 py-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-medium text-white text-[11px] uppercase tracking-wider">
            Pipeline Active
          </span>
          <span className="text-[#64748d]">·</span>
          <span className="text-[#8ca3ba] text-xs font-mono truncate">
            {pipelinePhase === "ingress" && `Ingress: ${activeClient.name} → TLS 1.3 Handshake`}
            {pipelinePhase === "engine" &&
              `Engine: ${ENGINE_MODULES[activeModuleIdx].label} (${ENGINE_MODULES[activeModuleIdx].invariant})`}
            {pipelinePhase === "dispatch" && `Dispatch: Outbound TLS → ${activeRail.name}`}
            {pipelinePhase === "delivered" &&
              `Settlement: ${activeRail.name} · Monotonic State [Successful]`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#8ca3ba]">
          <span className="bg-white/[0.04] border border-white/10 px-2.5 py-0.5 rounded-full text-white tabular-nums">
            P95: <span className="text-emerald-400 font-medium">7.8ms</span>
          </span>
          <span className="hidden sm:inline-block text-[#64748d]">Zero-Knowledge Transit</span>
        </div>
      </div>

      {/* 2. Header Bar with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 px-6 sm:px-8 py-5">
        <div>
          <h3 className="text-xl sm:text-2xl font-light tracking-tight text-white">
            End-to-end financial wire pipeline
          </h3>
          <p className="mt-1 text-xs text-[#8ca3ba]">
            Deterministic dual-engine architecture wrapping fragmented sovereign rails into unified
            state transitions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-1 border border-white/10 text-xs font-medium">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === tab.key
                  ? "bg-[#533afd] text-white shadow-xs"
                  : "text-[#8ca3ba] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Pipeline Three-Tier Grid */}
      <div className="grid gap-5 lg:grid-cols-[3fr_auto_4fr_auto_3fr] items-stretch p-6 sm:p-8 relative z-10">
        {/* Tier 1: Client Applications */}
        <div
          className={`flex flex-col gap-2.5 transition-opacity duration-200 ${
            activeTab === "all" || activeTab === "ingress" ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="flex items-center justify-between font-mono text-[11px] text-[#8ca3ba] px-0.5 pb-2 border-b border-white/10">
            <span>CLIENT PROTOCOLS</span>
            <span className="text-[#a8b1ff]">REST · gRPC</span>
          </div>

          {CLIENTS.map((c, idx) => {
            const isSelected = activeClientIdx === idx
            return (
              <div
                key={c.name}
                onClick={() => setActiveClientIdx(idx)}
                className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all relative ${
                  isSelected
                    ? "border-[#533afd] bg-[#533afd]/10 shadow-[0_1px_8px_rgba(83,58,253,0.15)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">{c.name}</p>
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8ca3ba] truncate mt-0.5">{c.desc}</p>
                </div>
                <span className="shrink-0 rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#c2d1e0]">
                  {c.lang}
                </span>
              </div>
            )
          })}
        </div>

        {/* Conduit 1: Client -> Engine */}
        <PipelineConduit
          direction="horizontal"
          label="TLS 1.3"
          sublabel="Ingress"
          isActive={pipelinePhase === "ingress"}
        />
        <PipelineConduit direction="vertical" label="TLS 1.3 Ingress" />

        {/* Tier 2: OpenWrapper Core Gateway Engine */}
        <div
          className={`rounded-xl border border-white/10 bg-[#0f142e] overflow-hidden flex flex-col justify-between transition-opacity duration-200 ${
            activeTab === "all" || activeTab === "engine" ? "opacity-100" : "opacity-40"
          }`}
        >
          {/* Engine Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#131a38]/80">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-[#533afd] text-white">
                <HugeiconsIcon icon={CpuIcon} size={14} />
              </div>
              <span className="text-xs font-medium text-white">OpenWrapper Gateway Engine</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Axum 0.7 · :8080
            </span>
          </div>

          {/* Engine Processing Modules */}
          <div className="divide-y divide-white/5 text-xs font-mono flex-1 flex flex-col justify-around py-1">
            {ENGINE_MODULES.map((mod, idx) => {
              const isModuleActive = pipelinePhase === "engine" && activeModuleIdx === idx
              return (
                <div
                  key={mod.label}
                  className={`flex items-center justify-between px-4 py-2.5 transition-colors relative ${
                    isModuleActive ? "bg-[#533afd]/10" : ""
                  }`}
                >
                  {isModuleActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#533afd]" />
                  )}
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <HugeiconsIcon
                      icon={mod.icon}
                      size={13}
                      className={isModuleActive ? "text-[#a8b1ff]" : "text-[#8ca3ba]"}
                    />
                    <div className="flex flex-col truncate">
                      <span
                        className={`truncate text-[11px] ${
                          isModuleActive ? "text-white font-medium" : "text-[#c2d1e0]"
                        }`}
                      >
                        {mod.label}
                      </span>
                      {isModuleActive && (
                        <span className="text-[10px] text-[#8ca3ba] font-sans truncate">
                          {mod.statusText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] text-[#64748d] hidden sm:inline-block">
                      {mod.invariant}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        isModuleActive
                          ? "bg-white/[0.08] text-white border-white/20"
                          : "bg-white/[0.02] text-[#8ca3ba] border-white/5"
                      }`}
                    >
                      {mod.badge}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mini Engine Live Telemetry Bar */}
          <div className="border-t border-white/10 px-4 py-2.5 bg-[#090d1f] flex items-center justify-between text-[11px] font-mono text-[#8ca3ba]">
            <span>Ledger Integrity</span>
            <span className="text-emerald-400 font-medium">Deterministic Parity OK</span>
          </div>
        </div>

        {/* Conduit 2: Engine -> Upstream Rails */}
        <PipelineConduit
          direction="horizontal"
          label="Dispatch"
          sublabel="Outbound"
          isActive={pipelinePhase === "dispatch"}
        />
        <PipelineConduit direction="vertical" label="Dispatch Outbound" />

        {/* Tier 3: Upstream Payment Rails */}
        <div
          className={`flex flex-col gap-2.5 transition-opacity duration-200 ${
            activeTab === "all" || activeTab === "rails" ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="flex items-center justify-between font-mono text-[11px] text-[#8ca3ba] px-0.5 pb-2 border-b border-white/10">
            <span>UPSTREAM RAILS</span>
            <span className="text-[#a8b1ff]">OUTBOUND TLS</span>
          </div>

          {RAILS.map((r, idx) => {
            const isRailSelected = activeRailIdx === idx
            const isDelivered = isRailSelected && pipelinePhase === "delivered"
            return (
              <div
                key={r.name}
                onClick={() => setActiveRailIdx(idx)}
                className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all relative ${
                  isRailSelected
                    ? "border-[#533afd] bg-[#533afd]/10 shadow-[0_1px_8px_rgba(83,58,253,0.15)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">{r.name}</p>
                    {isDelivered && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-medium">
                        ACK 200
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8ca3ba] truncate mt-0.5">{r.sub}</p>
                </div>
                <span className="shrink-0 rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#c2d1e0]">
                  {r.badge}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Footer System Invariants */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 px-6 sm:px-8 py-3.5 font-mono text-[11px] text-[#8ca3ba] bg-[#080b18]">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-400" />
          <span>Invariant I1: Zero floating-point drift (i64 minor units)</span>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1">
          <span>Connect: 10s timeout</span>
          <span>Read/Write: 30s bounded</span>
          <span className="text-white font-medium">100% Rust & TypeScript</span>
        </div>
      </div>
    </motion.div>
  )
}
