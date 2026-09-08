"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Server,
  ShieldAlert,
  Terminal,
} from "lucide-react"
import Link from "next/link"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GooTabs } from "@/components/ui/goo-tabs"

type DiagnosticTab = "incident" | "health" | "database"

interface HealthProbeResult {
  status: string
  latencyMs: number
  database?: string
  version?: string
  timestamp: string
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [activeTab, setActiveTab] = useState<DiagnosticTab>("incident")
  const [copied, setCopied] = useState(false)
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<HealthProbeResult | null>(null)

  useEffect(() => {
    console.error("OpenWrapper Dashboard Error Boundary caught exception:", error)
  }, [error])

  const incidentPayload = useMemo(() => {
    return JSON.stringify(
      {
        incident: {
          status: 500,
          type: "dashboard_query_interruption",
          message:
            error.message ||
            "We encountered an error while querying your transaction metrics or database records.",
          digest: error.digest ?? "none_assigned",
          timestamp: new Date().toISOString(),
          context: "OpenWrapper Dashboard Control Plane",
          rail_state: "isolated_no_funds_committed",
        },
      },
      null,
      2,
    )
  }, [error])

  const handleCopyIncident = async () => {
    try {
      await navigator.clipboard.writeText(incidentPayload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard fallback handled gracefully
    }
  }

  const handleRunHealthProbe = async () => {
    setProbing(true)
    const startTime = performance.now()
    try {
      const res = await fetch("/api/v1/health", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      const elapsed = Math.round(performance.now() - startTime)
      const data = await res.json()
      setProbeResult({
        status: res.ok ? (data.status ?? "healthy") : "degraded",
        latencyMs: elapsed,
        database: data.database ?? "connected",
        version: data.version ?? "0.2.0",
        timestamp: new Date().toLocaleTimeString(),
      })
    } catch {
      const elapsed = Math.round(performance.now() - startTime)
      setProbeResult({
        status: "offline",
        latencyMs: elapsed,
        database: "unreachable",
        version: "0.2.0",
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setProbing(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* 1. Global Navigation Bar */}
      <GlobalHeaderNavigation />

      {/* 2. Main Hero & Recovery Console with Signature Background */}
      <div className="relative isolate flex-1 overflow-hidden py-12 sm:py-20">
        <AtmosphericGradientMesh className="opacity-60 dark:opacity-30" />
        <StripeSwoosh className="opacity-40 dark:opacity-20" />

        <div className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-10">
          {/* Sculptural Hero Header */}
          <div className="flex flex-col items-center text-center gap-6 max-w-2xl animate-rise">
            {/* Signal Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3.5 py-1 text-xs font-mono text-destructive shadow-2xs">
              <span className="size-2 rounded-full bg-destructive animate-pulse" />
              <span>HTTP 500 · Dashboard Ledger Interruption</span>
            </div>

            {/* Sculptural 500 Numeral with Recovery Aperture */}
            <div className="relative select-none flex items-center justify-center py-2">
              <span className="text-7xl sm:text-9xl font-light tracking-tighter text-foreground/15 dark:text-foreground/10 font-mono">
                5
              </span>
              <div className="relative mx-3 sm:mx-6 size-16 sm:size-24 rounded-full border border-destructive/30 bg-card/70 backdrop-blur-md flex items-center justify-center stripe-card-shadow-md group transition-transform duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-full bg-destructive/10 animate-ping opacity-25" />
                <ShieldAlert className="size-8 sm:size-10 text-destructive transition-transform duration-500 group-hover:scale-110" />
              </div>
              <span className="text-7xl sm:text-9xl font-light tracking-tighter text-foreground/15 dark:text-foreground/10 font-mono">
                0
              </span>
            </div>

            {/* Headline & Description */}
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-5xl font-normal tracking-[-0.03em] text-foreground font-display">
                Failed to load dashboard data.
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto font-light">
                We encountered an error while querying your transaction metrics or database records.
                Financial data in transit remains isolated, and no partial state was committed to the ledger.
              </p>

              {error.digest && (
                <div className="mx-auto mt-1 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground bg-muted/60 border border-border/80 rounded-md py-1 px-3">
                  <span>Error Digest:</span>
                  <span className="font-semibold text-foreground select-all">{error.digest}</span>
                </div>
              )}
            </div>

            {/* Primary Recovery Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full max-w-md">
              <Button
                size="default"
                pill
                onClick={() => reset()}
                className="gap-2 font-medium text-xs px-5 h-10 stripe-card-shadow-xs flex-1 sm:flex-initial"
              >
                <RefreshCw className="size-3.5" />
                <span>Retry query</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                pill
                className="gap-2 font-medium text-xs border-border bg-card/80 hover:bg-muted/60 px-5 h-10 flex-1 sm:flex-initial stripe-card-shadow-xs"
                asChild
              >
                <Link href="/">
                  <Home className="size-4 text-primary" />
                  <span>Return to Home</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                size="default"
                pill
                className="gap-2 font-medium text-xs border-border bg-card/80 hover:bg-muted/60 px-5 h-10 flex-1 sm:flex-initial stripe-card-shadow-xs"
                asChild
              >
                <Link href="/checkout">
                  <CreditCard className="size-4 text-primary" />
                  <span>Launch Checkout</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* 3. Quick Recovery Navigation Grid */}
          <section className="w-full grid gap-3 sm:grid-cols-3 pt-2 animate-rise-delay">
            <Link
              href="/dashboard/payments"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/70 p-4 hover:border-primary/40 hover:bg-card transition-all shadow-2xs backdrop-blur-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="size-4 text-primary" />
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Ledger
                </Badge>
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span>Payments Ledger</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Verify settled transactions and monotonic state statuses
                </p>
              </div>
            </Link>

            <Link
              href="/checkout"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/70 p-4 hover:border-primary/40 hover:bg-card transition-all shadow-2xs backdrop-blur-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <Terminal className="size-4 text-primary" />
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Demo
                </Badge>
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span>Checkout Simulator</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Test fresh multi-rail transactions in isolated sandbox
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/documentation"
              className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/70 p-4 hover:border-primary/40 hover:bg-card transition-all shadow-2xs backdrop-blur-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="size-4 text-primary" />
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Docs
                </Badge>
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span>API Sandbox & Docs</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Inspect OpenAPI 3.1 endpoints and test curl vectors
                </p>
              </div>
            </Link>
          </section>

          {/* 4. Diagnostic & Incident Inspection Drawer */}
          <section className="w-full flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-muted-foreground tracking-wide flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-destructive" />
                <span>Incident Diagnostics & Crash Inspector</span>
              </span>

              {/* Diagnostic Tabs — Sliding Indicator */}
              <GooTabs
                items={[
                  { id: "incident", label: "Incident JSON" },
                  { id: "health", label: "Gateway Health" },
                  { id: "database", label: "DB Fallback" },
                ]}
                activeId={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
                className="bg-muted/60 border border-border/70 font-mono"
                indicatorClassName="bg-card text-foreground shadow-xs"
                activeTabClassName="text-foreground"
                size="sm"
              />
            </div>

            {/* Inspector Card */}
            <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl overflow-hidden stripe-card-shadow-sm">
              {/* Header Chrome */}
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-destructive/80" />
                  <span className="size-2.5 rounded-full bg-amber-500/80" />
                  <span className="size-2.5 rounded-full bg-emerald-500/80" />
                  <span className="font-mono text-[11px] text-muted-foreground ml-2">
                    {activeTab === "incident"
                      ? "dashboard_query_error.json"
                      : activeTab === "health"
                        ? "gateway_ingress_probe.telemetry"
                        : "database_persistence_guide.md"}
                  </span>
                </div>

                {activeTab === "incident" && (
                  <button
                    type="button"
                    onClick={handleCopyIncident}
                    aria-label="Copy incident JSON"
                    className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted cursor-pointer"
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{copied ? "Copied" : "Copy Incident"}</span>
                  </button>
                )}

                {activeTab === "health" && (
                  <button
                    type="button"
                    onClick={handleRunHealthProbe}
                    disabled={probing}
                    aria-label="Probe gateway health"
                    className="flex items-center gap-1.5 text-[11px] font-mono text-primary hover:text-primary-deep transition-colors px-2 py-1 rounded-md hover:bg-primary/10 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`size-3 ${probing ? "animate-spin" : ""}`} />
                    <span>{probing ? "Probing..." : "Run Health Check"}</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Incident JSON */}
              {activeTab === "incident" && (
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <pre className="text-xs font-mono text-muted-foreground/90 overflow-x-auto leading-relaxed selection:bg-destructive/30">
                    <code>{incidentPayload}</code>
                  </pre>
                </div>
              )}

              {/* Tab 2: Health Probe */}
              {activeTab === "health" && (
                <div className="p-5 flex flex-col gap-4 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        Gateway Ingress Health Check (/api/v1/health)
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Verifying local gateway and database state
                    </span>
                  </div>

                  {probeResult ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-1">
                        <span className="text-muted-foreground text-[11px]">
                          Backend Node Status
                        </span>
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle2
                            className={`size-3.5 ${
                              probeResult.status === "healthy" || probeResult.status === "ok"
                                ? "text-emerald-500"
                                : "text-amber-500"
                            }`}
                          />
                          <span className="text-foreground capitalize">{probeResult.status}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-1">
                        <span className="text-muted-foreground text-[11px]">
                          Roundtrip Ingress RTT
                        </span>
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="size-3.5 text-primary" />
                          <span className="text-foreground">{probeResult.latencyMs} ms</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-1">
                        <span className="text-muted-foreground text-[11px]">
                          Database Connectivity
                        </span>
                        <span className="text-foreground font-medium capitalize">
                          {probeResult.database}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-1">
                        <span className="text-muted-foreground text-[11px]">Probe Timestamp</span>
                        <span className="text-foreground font-medium">{probeResult.timestamp}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
                      <p>Check if the local Rust gateway node or PostgreSQL/SQLite is reachable.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunHealthProbe}
                        disabled={probing}
                        className="gap-2 text-xs h-8"
                      >
                        <RefreshCw className={`size-3 ${probing ? "animate-spin" : ""}`} />
                        <span>Execute Health Check</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Database Fallback Guide */}
              {activeTab === "database" && (
                <div className="p-5 flex flex-col gap-4 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-mono pb-2 border-b border-border/50">
                    <Database className="size-4 text-primary" />
                    <span>Database Connectivity & Fallback Telemetry</span>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    OpenWrapper supports dual persistence parity (PostgreSQL with PgBouncer or local SQLite edge mode).
                    When PostgreSQL credentials fail, the gateway gracefully operates in stateless zero-storage fallback mode.
                  </p>

                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3 font-mono text-[11px] space-y-1.5">
                    <div className="text-foreground font-semibold">Local SQLite Edge Mode:</div>
                    <div className="text-muted-foreground">
                      Set <code className="text-primary">OPENWRAPPER_DATABASE_URL=openwrapper.sqlite3</code> in <code className="text-foreground">.env</code> to operate offline without PostgreSQL.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyIncident}
                      className="gap-2 text-xs h-8 font-mono"
                    >
                      <Copy className="size-3" />
                      <span>{copied ? "Copied Incident" : "Copy Diagnostic Payload"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="gap-2 text-xs h-8 text-primary hover:text-primary-deep"
                    >
                      <Link href="mailto:support@openwrapper.org?subject=Database%20Connectivity%20Issue">
                        <Mail className="size-3" />
                        <span>Contact Platform Support</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 5. Global Enterprise Footer */}
      <GlobalFooterNavigation />
    </main>
  )
}
