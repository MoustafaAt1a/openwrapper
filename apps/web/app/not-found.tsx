"use client"

import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CreditCard,
  FileCode2,
  KeyRound,
  LayoutDashboard,
  Palette,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react"
import Link from "next/link"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DestinationRoute {
  title: string
  description: string
  href: string
  category: "Dashboard" | "Developers" | "Checkout" | "Platform"
  icon: typeof LayoutDashboard
  tag: string
}

const DESTINATION_ROUTES: DestinationRoute[] = [
  {
    title: "Payments Ledger",
    description: "Authoritative transaction records, monotonic state transitions, and refunds",
    href: "/dashboard/payments",
    category: "Dashboard",
    icon: CreditCard,
    tag: "Real-time",
  },
  {
    title: "Interactive Checkout Demo",
    description: "Multi-rail payment simulator supporting Meeza, Mobile Wallets, Cards & Fawry",
    href: "/checkout",
    category: "Checkout",
    icon: CreditCard,
    tag: "Interactive",
  },
  {
    title: "Developer Sandbox & Docs",
    description: "Live interactive curl requests, sandbox test cards, and OpenAPI 3.1 definitions",
    href: "/dashboard/documentation",
    category: "Developers",
    icon: Terminal,
    tag: "Sandbox",
  },
  {
    title: "API Keys & Secrets",
    description: "Manage live and test merchant gateway credentials with zero database storage",
    href: "/dashboard/api-keys",
    category: "Dashboard",
    icon: KeyRound,
    tag: "Vault",
  },
  {
    title: "Merchant Settings",
    description: "Webhook signing keys, settlement currency preferences, and refund policies",
    href: "/dashboard/settings",
    category: "Dashboard",
    icon: Settings,
    tag: "Config",
  },
  {
    title: "Client SDK Libraries",
    description: "Strongly typed zero-dependency clients for TypeScript, .NET 8/9, and PHP 8.1+",
    href: "/sdk",
    category: "Developers",
    icon: FileCode2,
    tag: "Polyglot",
  },
  {
    title: "Latency & Telemetry",
    description: "Distribution percentiles (p50, p95, p99) and real-time rail health telemetry",
    href: "/dashboard/telemetry",
    category: "Platform",
    icon: Activity,
    tag: "Metrics",
  },
  {
    title: "Brand DNA & Design Kit",
    description: "Accessible color tokens, typography scales, and sovereign interface guidelines",
    href: "/brand",
    category: "Platform",
    icon: Palette,
    tag: "Design",
  },
]

type DiagnosticTab = "json" | "health" | "invariants"

interface HealthProbeResult {
  status: string
  latencyMs: number
  database?: string
  version?: string
  timestamp: string
}

export default function NotFound() {
  const pathname = usePathname() || "/unmatched-route"
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const [activeTab, setActiveTab] = useState<DiagnosticTab>("json")
  const [copied, setCopied] = useState(false)
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<HealthProbeResult | null>(null)

  const errorPayload = useMemo(() => {
    return JSON.stringify(
      {
        error: {
          type: "invalid_request_error",
          code: "route_not_found",
          message: `The requested path '${pathname}' does not match any registered gateway route or dashboard view.`,
          status: 404,
          gateway_version: "0.2.0-LTS",
          rail: "unified_routing_layer",
          invariant_check: "nominal",
        },
      },
      null,
      2,
    )
  }, [pathname])

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return DESTINATION_ROUTES.filter((route) => {
      const matchesCategory = activeCategory === "All" || route.category === activeCategory
      const matchesQuery =
        !q ||
        route.title.toLowerCase().includes(q) ||
        route.description.toLowerCase().includes(q) ||
        route.href.toLowerCase().includes(q) ||
        route.tag.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [searchQuery, activeCategory])

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(errorPayload)
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

      {/* 2. Main Hero & Route Exploration Hub with Signature Background */}
      <div className="relative isolate flex-1 overflow-hidden py-12 sm:py-20">
        <AtmosphericGradientMesh className="opacity-60 dark:opacity-30" />
        <StripeSwoosh className="opacity-40 dark:opacity-20" />

        <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-12">
          {/* Sculptural Hero Header */}
          <div className="flex flex-col items-center text-center gap-6 max-w-2xl animate-rise">
            {/* Refined Signal Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3.5 py-1 text-xs font-mono text-muted-foreground shadow-2xs">
              <span className="size-2 rounded-full bg-destructive animate-pulse" />
              <span>HTTP 404 · Unmatched Rail Dispatch</span>
            </div>

            {/* Sculptural 404 Numeral with Nexus Aperture */}
            <div className="relative select-none flex items-center justify-center py-2">
              <span className="text-7xl sm:text-9xl font-light tracking-tighter text-foreground/15 dark:text-foreground/10 font-mono">
                4
              </span>
              <div className="relative mx-3 sm:mx-6 size-16 sm:size-24 rounded-full border border-border/80 bg-card/70 backdrop-blur-md flex items-center justify-center stripe-card-shadow-md group transition-transform duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-25" />
                <Compass className="size-8 sm:size-10 text-primary transition-transform duration-700 group-hover:rotate-90" />
              </div>
              <span className="text-7xl sm:text-9xl font-light tracking-tighter text-foreground/15 dark:text-foreground/10 font-mono">
                4
              </span>
            </div>

            {/* Headline & Description */}
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-5xl font-normal tracking-[-0.03em] text-foreground font-display">
                Route not found on gateway rail.
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto font-light">
                The path{" "}
                <code className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs text-foreground font-medium break-all">
                  {pathname}
                </code>{" "}
                does not resolve to any active payment rail, dashboard view, or API endpoint.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full max-w-md">
              <Button
                size="default"
                pill
                className="gap-2 font-medium text-xs px-5 h-10 stripe-card-shadow-xs flex-1 sm:flex-initial"
                asChild
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  <span>Open Dashboard</span>
                  <ArrowRight className="size-3.5 ml-0.5" />
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
                  <span>Launch Checkout Demo</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* 4. Interactive Route Navigator Search */}
          <section className="w-full flex flex-col gap-6 pt-4 animate-rise-delay">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <h2 className="text-lg font-medium tracking-tight text-foreground">
                  Find a platform destination
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jump directly to authoritative payment records, developer tools, or configuration
                </p>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["All", "Dashboard", "Developers", "Checkout", "Platform"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search routes by name, description, or keyword (e.g. 'payments', 'keys', 'sandbox')..."
                className="pl-10 pr-10 h-11 text-sm bg-card/80 border-border/80 rounded-xl shadow-2xs stripe-input-focus"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filtered Route Grid */}
            {filteredRoutes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRoutes.map((route) => {
                  const Icon = route.icon
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 hover:bg-card hover:border-primary/40 hover:stripe-card-shadow-sm transition-all duration-200 backdrop-blur-xs"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                            <Icon className="size-4.5" />
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
                            {route.tag}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>{route.title}</span>
                            <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {route.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span className="truncate">{route.href}</span>
                        <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Navigate
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-card/40">
                <Compass className="size-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  No matching destinations found
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  No active routes match &quot;{searchQuery}&quot;. Try searching for
                  &quot;ledger&quot;, &quot;api&quot;, or &quot;checkout&quot;.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setActiveCategory("All")
                  }}
                  className="mt-4 text-xs h-8"
                >
                  Reset Search Filters
                </Button>
              </div>
            )}
          </section>

          {/* 5. Developer & Gateway Diagnostic Inspector */}
          <section className="w-full max-w-3xl flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-muted-foreground tracking-wide flex items-center gap-2">
                <Terminal className="size-3.5 text-primary" />
                <span>Gateway Diagnostics & Wire Inspection</span>
              </span>

              {/* Diagnostic Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/70">
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === "json"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wire JSON
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("health")}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === "health"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Health Probe
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("invariants")}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === "invariants"
                      ? "bg-card text-foreground shadow-xs font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Invariants
                </button>
              </div>
            </div>

            {/* Inspector Panel Body */}
            <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl overflow-hidden stripe-card-shadow-sm">
              {/* Header Chrome */}
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-destructive/80" />
                  <span className="size-2.5 rounded-full bg-amber-500/80" />
                  <span className="size-2.5 rounded-full bg-emerald-500/80" />
                  <span className="font-mono text-[11px] text-muted-foreground ml-2">
                    {activeTab === "json"
                      ? "gateway_dispatch_error.json"
                      : activeTab === "health"
                        ? "live_health_probe.telemetry"
                        : "monorepo_audit_invariants.spec"}
                  </span>
                </div>

                {activeTab === "json" && (
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    aria-label="Copy error JSON"
                    className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{copied ? "Copied" : "Copy Payload"}</span>
                  </button>
                )}

                {activeTab === "health" && (
                  <button
                    type="button"
                    onClick={handleRunHealthProbe}
                    disabled={probing}
                    aria-label="Probe gateway health"
                    className="flex items-center gap-1.5 text-[11px] font-mono text-primary hover:text-primary-deep transition-colors px-2 py-1 rounded-md hover:bg-primary/10 disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3 ${probing ? "animate-spin" : ""}`} />
                    <span>{probing ? "Probing..." : "Run Ping Probe"}</span>
                  </button>
                )}
              </div>

              {/* Tab 1: JSON Error Payload */}
              {activeTab === "json" && (
                <pre className="p-4 sm:p-5 text-xs font-mono text-muted-foreground/90 overflow-x-auto leading-relaxed selection:bg-primary/30">
                  <code>{errorPayload}</code>
                </pre>
              )}

              {/* Tab 2: Health Probe */}
              {activeTab === "health" && (
                <div className="p-5 flex flex-col gap-4 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        Local Gateway Node Probe (/api/v1/health)
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Target: {typeof window !== "undefined" ? window.location.origin : "localhost"}
                    </span>
                  </div>

                  {probeResult ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/50 p-3 flex flex-col gap-1">
                        <span className="text-muted-foreground text-[11px]">System Status</span>
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
                        <span className="text-muted-foreground text-[11px]">Probed Timestamp</span>
                        <span className="text-foreground font-medium">{probeResult.timestamp}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
                      <p>Click &quot;Run Ping Probe&quot; to test ingress roundtrip latency.</p>
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

              {/* Tab 3: System Invariants */}
              {activeTab === "invariants" && (
                <div className="p-5 flex flex-col gap-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-mono pb-2 border-b border-border/50">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span>Enforced Monetary & Dispatch Guarantees</span>
                  </div>

                  <div className="space-y-2.5 text-muted-foreground leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-primary font-bold shrink-0">I1</span>
                      <span>
                        <strong className="text-foreground">Discrete Integer Minor Units:</strong>{" "}
                        All transactions operate strictly on 64-bit integer minor units
                        (piasters/cents) to guarantee zero floating-point drift.
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-primary font-bold shrink-0">I3</span>
                      <span>
                        <strong className="text-foreground">Zero-Knowledge Stateless Mode:</strong>{" "}
                        Merchant provider API keys and secrets are passed in transit and never
                        persisted in database tables.
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-primary font-bold shrink-0">I4</span>
                      <span>
                        <strong className="text-foreground">Strict Idempotency:</strong> Replayed
                        requests with identical idempotency keys return cached results without
                        double charges.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 3. Authoritative Enterprise Footer */}
      <GlobalFooterNavigation />
    </main>
  )
}
