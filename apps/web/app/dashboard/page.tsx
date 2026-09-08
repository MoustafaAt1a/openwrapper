import { ArrowRight, CreditCard, KeyRound } from "lucide-react"
import { cookies, headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { PaymentStatusBadge } from "@/components/dashboard/payment-status-badge"
import { ProviderRailMixChart } from "@/components/dashboard/provider-rail-mix-chart"
import { ProviderRailPerformanceChart } from "@/components/dashboard/provider-rail-performance-chart"
import { SettlementVolumeTrendChart } from "@/components/dashboard/settlement-volume-trend-chart"
import { TelemetryMetricCard } from "@/components/dashboard/telemetry-metric-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { CodeBlock } from "@/lib/code-syntax-highlighter"
import { getDashboardData } from "@/lib/dashboard-telemetry-service"
import { getMerchantSettings } from "@/lib/merchant-settings-service"
import { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-status-resolver"
import { formatDate, formatMinorUnits, formatShortDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  const [data, settings] = await Promise.all([
    getDashboardData(session.user.id, env),
    getMerchantSettings(session.user.id, session.user.name, session.user.email),
  ])
  const m = data.metrics
  const currency = settings.currency || "EGP"

  const formatCurrency = (minor: number) => formatMinorUnits(minor, currency)

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <DashboardPageHeader
          title={`Welcome back, ${session.user.name.split(" ")[0]}`}
          description={
            env === "test"
              ? "Viewing Test Environment — sandbox transactions and mock providers. No real funds moved."
              : "Viewing Live Production — authoritative multi-rail transactions and real settlements."
          }
          actions={
            <Button
              size="sm"
              variant="outline"
              pill
              asChild
              className="border-border bg-card stripe-card-shadow-xs hover:bg-muted"
            >
              <Link href="/dashboard/payments">
                <CreditCard className="w-4 h-4" />
                <span>Transactions</span>
              </Link>
            </Button>
          }
        />

        {/* 4 Precision Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPI overview">
          <TelemetryMetricCard
            label="Settled volume"
            value={formatCurrency(m.settledVolumeMinor)}
            hint="Succeeded payments only"
            color="emerald"
          />
          <TelemetryMetricCard
            label="Total transactions"
            value={String(m.totalPayments)}
            hint={`${m.pendingPayments} pending or awaiting action`}
            color="violet"
          />
          <TelemetryMetricCard
            label="API success rate"
            value={m.apiSuccessRate24h !== null ? `${m.apiSuccessRate24h.toFixed(1)}%` : "—"}
            hint={
              m.apiSuccessRate24h !== null ? "All gateway requests (24h)" : "No requests in 24h"
            }
            color="blue"
          />
          <TelemetryMetricCard
            label="Routing P95"
            value={m.routingLatencyP95 !== null ? `${m.routingLatencyP95} ms` : "—"}
            hint={
              m.routingLatencyP95 !== null
                ? `P50: ${m.routingLatencyP50} ms · Tokio Axum`
                : "Awaiting telemetry samples"
            }
            color="orange"
          />
        </section>

        {/* Volume & Errors Chart Card */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg font-light tracking-tight text-foreground">
              Volume & errors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SettlementVolumeTrendChart
              weeklyData={data.weeklyChart}
              monthlyData={data.monthlyChart}
              currency={currency}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Recent Transactions Card */}
          <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border p-5">
              <CardTitle className="text-base font-medium text-foreground">
                Recent transactions
              </CardTitle>
              <Button variant="ghost" size="sm" pill asChild className="text-xs font-mono">
                <Link href="/dashboard/payments" className="flex items-center gap-1">
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground font-light">
                  No transactions yet. Create a payment via SDK or the checkout demo.
                </p>
              ) : (
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="w-[150px] pl-5 font-mono text-[11px] text-muted-foreground">
                        Payment ID
                      </TableHead>
                      <TableHead className="w-[85px] font-mono text-[11px] text-muted-foreground">
                        Rail
                      </TableHead>
                      <TableHead className="w-[110px] font-mono text-[11px] text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="w-[105px] text-right font-mono text-[11px] text-muted-foreground">
                        Amount
                      </TableHead>
                      <TableHead className="w-[110px] pr-5 text-right font-mono text-[11px] text-muted-foreground">
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.slice(0, 6).map((p) => (
                      <TableRow
                        key={p.id}
                        className="hover:bg-secondary/40 transition-colors border-border/60"
                      >
                        <TableCell className="pl-5 font-mono text-xs font-medium text-foreground">
                          <span className="block truncate max-w-[130px]" title={p.id}>
                            {p.id.slice(0, 8)}…{p.id.slice(-4)}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize text-xs font-medium text-muted-foreground">
                          {p.provider}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge
                            status={normalizePaymentStatus(p.status, paymentHasNextAction(p))}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium text-foreground font-tnum whitespace-nowrap">
                          {formatMinorUnits(p.amountMinorUnits, p.currency)}
                        </TableCell>
                        <TableCell className="pr-5 text-right text-xs text-muted-foreground whitespace-nowrap font-mono font-tnum">
                          <span title={formatDate(p.createdAt)} suppressHydrationWarning>
                            {formatShortDate(p.createdAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Rail Mix & Conversion Card */}
          <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border p-5">
              <div>
                <CardTitle className="text-base font-medium text-foreground">
                  Rail mix & conversion
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-light">
                  Distribution and settlement efficiency across Paymob, Fawry, and Stripe
                </p>
              </div>
              <Button variant="ghost" size="sm" pill asChild className="text-xs font-mono">
                <Link href="/dashboard/providers" className="flex items-center gap-1">
                  <span>Providers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6">
              <ProviderRailMixChart data={m.providerMix} />
              {m.providerMix.some((p) => p.count > 0) && (
                <div className="border-t border-border pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Settlement Efficiency by Rail
                  </p>
                  <ProviderRailPerformanceChart data={m.providerMix} currency={currency} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* API Access & Developer Quickstart Bento Card */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border p-5">
            <div>
              <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Developer API Access
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-light">
                {data.keys.length > 0
                  ? `${data.keys.length} active API ${data.keys.length === 1 ? "key" : "keys"} provisioned for ${env} environment.`
                  : `No ${env} API keys provisioned yet.`}
              </p>
            </div>
            <Button size="sm" variant="outline" pill asChild className="text-xs font-mono">
              <Link href="/dashboard/api-keys" className="flex items-center gap-1.5">
                <span>Manage keys</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground font-mono">
                  Authentication Header
                </span>
                <span className="text-xs text-muted-foreground font-light">
                  Include your cryptographic token as a standard HTTP Bearer authorization header.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-mono text-primary font-medium">
                  Authorization: Bearer{" "}
                  {data.keys[0]
                    ? `${data.keys[0].prefix}…${data.keys[0].lastFour}`
                    : env === "test"
                      ? "ow_test_..."
                      : "ow_live_..."}
                </code>
              </div>
            </div>

            <div>
              <CodeBlock
                code={`curl -X POST https://gateway.openwrapper.muejam.com/api/v1/payments \\\n  -H "Authorization: Bearer ${data.keys[0]?.prefix ?? (env === "test" ? "ow_test_secret" : "ow_live_secret")}..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount_minor_units": 25000, "currency": "${currency}", "provider": "paymob"}'`}
                language="bash"
                filename="quickstart.sh"
                showLineNumbers={false}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </ControlPlaneShell>
  )
}
