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
  color: string
  accentBorder: string
}

const CLIENTS: ClientItem[] = [
  { id: "ts", name: "TypeScript SDK", desc: "@openwrapper/sdk (Bun/Node)", lang: "TS" },
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
    iconColor: "text-emerald-400",
    badgeColor: "text-[#6b7f99]",
    statusText: "Memory sandbox verified",
  },
  {
    id: "idem",
    icon: ShieldCheckIcon,
    label: "Idempotency guard",
    badge: "SHA-256",
    iconColor: "text-emerald-400",
    badgeColor: "text-emerald-400",
    statusText: "Replay attack prevented",
  },
  {
    id: "math",
    icon: ZapIcon,
    label: "Minor units math core",
    badge: "i64 integer",
    iconColor: "text-amber-400",
    badgeColor: "text-amber-400",
    statusText: "Float inaccuracy: 0.00%",
  },
  {
    id: "store",
    icon: Database01Icon,
    label: "Dual store parity",
    badge: "Postgres / SQLite",
    iconColor: "text-[#8c82fc]",
    badgeColor: "text-[#8c82fc]",
    statusText: "WAL journal sync 1.2ms",
  },
]

const RAILS: RailItem[] = [
  {
    id: "paymob",
    name: "Paymob Gateway",
    sub: "Meeza, 3DS Cards, Wallets",
    badge: "EGP / SAR / AED",
    color: "text-[#8c82fc]",
    accentBorder: "border-[#533afd]/60",
  },
  {
    id: "fawry",
    name: "Fawry Retail POS",
    sub: "180,000+ Physical Kiosks",
    badge: "Cash 8-digit Ref",
    color: "text-amber-400",
    accentBorder: "border-amber-500/60",
  },
  {
    id: "wallets",
    name: "Mobile Wallets",
    sub: "Vodafone, Orange, Etisalat",
    badge: "Instant Push OTP",
    color: "text-red-400",
    accentBorder: "border-red-500/60",
  },
  {
    id: "stripe",
    name: "Stripe & Global",
    sub: "Apple Pay, Intl Cards, 3DS",
    badge: "USD / EUR / Global",
    color: "text-blue-400",
    accentBorder: "border-blue-500/60",
  },
]

// Animated Conduit Component for Desktop & Mobile
function PipelineConduit({
  direction = "horizontal",
  color = "#533afd",
  label,
  sublabel,
  isActive = false,
}: {
  direction?: "horizontal" | "vertical"
  color?: string
  label: string
  sublabel?: string
  isActive?: boolean
}) {
  if (direction === "vertical") {
    return (
      <div className="flex flex-col items-center justify-center py-2 lg:hidden">
        <div className="relative h-8 w-px bg-[#1e2646] overflow-hidden">
          <motion.div
            animate={{ y: [-32, 32] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-transparent via-white to-transparent"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#6b7f99] mt-0.5">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex flex-col items-center justify-center px-1 w-20">
      <span className="font-mono text-[9px] text-[#6b7f99] uppercase tracking-wider mb-1">
        {label}
      </span>
      <div className="relative w-full h-6 flex items-center">
        {/* Track Line */}
        <svg viewBox="0 0 80 20" className="w-full h-5 overflow-visible" fill="none">
          <path d="M 0 10 L 80 10" stroke="#1e2646" strokeWidth="2" strokeDasharray="3 3" />
          {/* Animated Flowing Laser Pulse */}
          <motion.path
            d="M 0 10 L 80 10"
            stroke={color}
            strokeWidth={isActive ? 2.5 : 2}
            strokeLinecap="round"
            initial={{ pathOffset: 0, pathLength: 0.3 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ filter: `drop-shadow(0 0 ${isActive ? "8px" : "4px"} ${color})` }}
          />
          {/* Traveling Photon Core */}
          <motion.circle
            r="3"
            cy="10"
            fill="#ffffff"
            animate={{ cx: [0, 80] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
      </div>
      <div className="flex items-center gap-0.5 text-[9px] font-mono text-[#8ca3ba]">
        <span>{sublabel}</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={10} className="text-[#8ca3ba]/70" />
      </div>
    </div>
  )
}

export function ArchitectureFlow() {
  const [activeTab, setActiveTab] = useState<"ingress" | "storage" | "rails">("ingress")

  // Pipeline Simulation State Machine (Cycles automatically or on interaction)
  const [pipelinePhase, setPipelinePhase] = useState<
    "ingress" | "engine" | "dispatch" | "delivered"
  >("ingress")
  const [activeClientIdx, setActiveClientIdx] = useState(0)
  const [activeRailIdx, setActiveRailIdx] = useState(0)
  const [activeModuleIdx, setActiveModuleIdx] = useState(0)

  useEffect(() => {
    // Pipeline Animation Cycle loop
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
        // delivered -> loop back to next pair
        setActiveClientIdx((c) => (c + 1) % CLIENTS.length)
        setActiveRailIdx((r) => (r + 1) % RAILS.length)
        return "ingress"
      })
    }, 1600)

    return () => clearInterval(timer)
  }, [])

  // Sub-step engine cycling when inside engine phase
  useEffect(() => {
    if (pipelinePhase === "engine") {
      const subTimer = setInterval(() => {
        setActiveModuleIdx((m) => (m + 1) % ENGINE_MODULES.length)
      }, 350)
      return () => clearInterval(subTimer)
    }
  }, [pipelinePhase])

  const tabs = [
    { key: "ingress" as const, short: "Ingress", full: "Ingress & Auth" },
    { key: "storage" as const, short: "Engine", full: "Engine & Ledger" },
    { key: "rails" as const, short: "Rails", full: "Sovereign Rails" },
  ]

  const activeClient = CLIENTS[activeClientIdx]
  const activeRail = RAILS[activeRailIdx]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full overflow-hidden rounded-2xl border border-[#1e2646] bg-[#0c1024] text-white shadow-2xl relative"
    >
      {/* Dynamic Background Ambient Aura */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 w-[450px] h-[300px] bg-[#533afd]/10 rounded-full blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-1/4 w-[450px] h-[300px] bg-[#ea2261]/10 rounded-full blur-[100px]"
        aria-hidden="true"
      />

      {/* Top Telemetry Pipeline Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2646] bg-[#0a0d1f]/80 px-6 sm:px-8 py-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-emerald-400 font-medium">LIVE PIPELINE WIRE</span>
          <span className="text-[#6b7f99]">·</span>
          <span className="text-white/80 text-[11px] truncate">
            {pipelinePhase === "ingress" && `Ingressing: ${activeClient.name} → TLS 1.3 Handshake`}
            {pipelinePhase === "engine" && `Processing: ${ENGINE_MODULES[activeModuleIdx].label}`}
            {pipelinePhase === "dispatch" && `Routing: TLS Outbound → ${activeRail.name}`}
            {pipelinePhase === "delivered" && `Authorized: ${activeRail.name} [200 OK]`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#8ca3ba]">
          <span className="bg-[#141b33] border border-white/10 px-2 py-0.5 rounded text-[#a1b0cb]">
            Latency: <strong className="text-emerald-400 font-normal">7.8ms</strong>
          </span>
          <span className="hidden sm:inline-block text-[#6b7f99]">Zero-Knowledge Mode</span>
        </div>
      </div>

      {/* Header Bar with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2646] px-6 sm:px-8 py-5">
        <div>
          <h3 className="text-lg sm:text-xl font-light tracking-tight text-white">
            End-to-end financial wire pipeline
          </h3>
          <p className="mt-0.5 text-xs text-[#8ca3ba] font-mono">
            Deterministic dual-engine architecture with real-time wire verification
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-0.5 text-xs font-mono">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-3 py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "text-white bg-white/[0.06]"
                  : "text-[#8ca3ba] hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.full}</span>
              {activeTab === tab.key && (
                <motion.span
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#533afd]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Three-Tier Grid */}
      <div className="grid gap-5 lg:grid-cols-[3fr_auto_4fr_auto_3fr] items-stretch p-6 sm:p-8 relative z-10">
        {/* Tier 1: Client Applications */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#8ca3ba] px-0.5 pb-2 border-b border-[#1e2646]/50">
            <span>CLIENT SDKs</span>
            <span className="text-[#533afd]">REST / gRPC</span>
          </div>

          {CLIENTS.map((c, idx) => {
            const isSelected = activeClientIdx === idx
            return (
              <motion.div
                key={c.name}
                onClick={() => setActiveClientIdx(idx)}
                animate={{
                  borderColor: isSelected ? "rgba(83, 58, 253, 0.7)" : "rgba(30, 38, 70, 0.8)",
                  backgroundColor: isSelected ? "rgba(20, 27, 54, 0.9)" : "rgba(15, 20, 42, 1)",
                }}
                className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all relative overflow-hidden ${
                  isSelected
                    ? "shadow-[0_0_15px_rgba(83,58,253,0.15)]"
                    : "hover:border-[#533afd]/40"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="clientActiveGlow"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[#533afd]"
                  />
                )}
                <div className="min-w-0 pl-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">{c.name}</p>
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#6b7f99] font-mono truncate">{c.desc}</p>
                </div>
                <span className="shrink-0 ml-2 rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-[#8ca3ba]">
                  {c.lang}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Conduit 1: Client -> Engine */}
        <PipelineConduit
          direction="horizontal"
          color="#533afd"
          label="TLS 1.3"
          sublabel="Ingress"
          isActive={pipelinePhase === "ingress"}
        />
        <PipelineConduit direction="vertical" color="#533afd" label="TLS 1.3 Ingress" />

        {/* Tier 2: OpenWrapper Core Engine */}
        <div className="rounded-2xl border border-[#533afd]/30 bg-[#0f142e] overflow-hidden flex flex-col justify-between shadow-xl relative">
          {/* Subtle Scanning Beam when processing */}
          {pipelinePhase === "engine" && (
            <motion.div
              animate={{ y: [-10, 200] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-[#533afd]/15 to-transparent blur-sm"
            />
          )}

          {/* Engine Header */}
          <div className="flex items-center justify-between border-b border-[#1e2646] px-4 py-3 bg-[#131a38]/60">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-[#533afd] text-white shadow-[0_0_10px_rgba(83,58,253,0.5)]">
                <HugeiconsIcon icon={CpuIcon} size={14} />
              </div>
              <div>
                <span className="text-sm font-medium text-white">OpenWrapper Engine</span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Axum 0.8 :8080
            </span>
          </div>

          {/* Engine Processing Modules with Active Pipeline Highlighting */}
          <div className="divide-y divide-[#1e2646]/60 text-xs font-mono flex-1 flex flex-col justify-around py-1">
            {ENGINE_MODULES.map((mod, idx) => {
              const isModuleActive = pipelinePhase === "engine" && activeModuleIdx === idx
              return (
                <motion.div
                  key={mod.label}
                  animate={{
                    backgroundColor: isModuleActive
                      ? "rgba(83, 58, 253, 0.12)"
                      : "rgba(83, 58, 253, 0)",
                  }}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors relative"
                >
                  {isModuleActive && (
                    <motion.div
                      layoutId="activeModulePip"
                      className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#8c82fc]"
                    />
                  )}
                  <span className="flex items-center gap-2 text-[11px] text-white/90">
                    <HugeiconsIcon
                      icon={mod.icon}
                      size={13}
                      className={isModuleActive ? "text-white" : mod.iconColor}
                    />
                    <span className={isModuleActive ? "text-white font-medium" : "text-white/80"}>
                      {mod.label}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isModuleActive && (
                      <span className="text-[9px] text-[#8c82fc] hidden sm:inline-block animate-pulse">
                        {mod.statusText}
                      </span>
                    )}
                    <span
                      className={`text-[10px] ${
                        isModuleActive ? "text-white font-semibold" : mod.badgeColor
                      }`}
                    >
                      {mod.badge}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Mini Engine Live Telemetry Bar */}
          <div className="border-t border-[#1e2646] px-4 py-2 bg-[#0a0d1f] flex items-center justify-between text-[10px] font-mono text-[#6b7f99]">
            <span>Ledger Integrity</span>
            <span className="text-emerald-400">Deterministic Parity OK</span>
          </div>
        </div>

        {/* Conduit 2: Engine -> Upstream Rails */}
        <PipelineConduit
          direction="horizontal"
          color="#ea2261"
          label="Dispatch"
          sublabel="TLS Out"
          isActive={pipelinePhase === "dispatch"}
        />
        <PipelineConduit direction="vertical" color="#ea2261" label="Dispatch Outbound" />

        {/* Tier 3: Upstream Payment Rails */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#8ca3ba] px-0.5 pb-2 border-b border-[#1e2646]/50">
            <span>UPSTREAM RAILS</span>
            <span className="text-[#ea2261]">OUTBOUND TLS</span>
          </div>

          {RAILS.map((r, idx) => {
            const isRailSelected = activeRailIdx === idx
            const isDelivered = isRailSelected && pipelinePhase === "delivered"
            return (
              <motion.div
                key={r.name}
                onClick={() => setActiveRailIdx(idx)}
                animate={{
                  borderColor: isRailSelected
                    ? isDelivered
                      ? "rgba(16, 185, 129, 0.8)"
                      : "rgba(234, 34, 97, 0.7)"
                    : "rgba(30, 38, 70, 0.8)",
                  backgroundColor: isRailSelected ? "rgba(20, 27, 54, 0.9)" : "rgba(15, 20, 42, 1)",
                }}
                className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition-all relative overflow-hidden ${
                  isRailSelected
                    ? "shadow-[0_0_15px_rgba(234,34,97,0.15)]"
                    : "hover:border-[#ea2261]/40"
                }`}
              >
                {isRailSelected && (
                  <motion.div
                    layoutId="railActiveGlow"
                    className={`absolute right-0 top-0 bottom-0 w-1 ${
                      isDelivered ? "bg-emerald-400" : "bg-[#ea2261]"
                    }`}
                  />
                )}
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-white truncate">{r.name}</p>
                    {isDelivered && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                        ACK
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6b7f99] font-mono truncate">{r.sub}</p>
                </div>
                <span className={`shrink-0 ml-2 font-mono text-[9px] font-medium ${r.color}`}>
                  {r.badge}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer System Invariants */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1e2646] px-6 sm:px-8 py-4 font-mono text-[11px] text-[#6b7f99] bg-[#090d1f]">
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-400/80" />
          <span>Zero floating-point inaccuracies (i64 minor units)</span>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1">
          <span>Connect: 10s timeout</span>
          <span>Read/Write: 30s bounded</span>
          <span className="text-white/80 font-medium">100% Rust & TypeScript</span>
        </div>
      </div>
    </motion.div>
  )
}
