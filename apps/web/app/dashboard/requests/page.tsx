import { and, count, desc, eq, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { LatencyDistributionChart } from "@/components/dashboard/latency-distribution-chart"
import { LiveRequestTelemetryTable } from "@/components/dashboard/live-request-telemetry-table"
import { TelemetryMetricCard } from "@/components/dashboard/telemetry-metric-card"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { StatusSettlementDistributionChart } from "@/components/dashboard/status-settlement-distribution-chart"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiRequests } from "@/lib/db/schema"

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)] ?? 0
}

export default async function RequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(apiRequests)
      .where(and(eq(apiRequests.userId, session.user.id), eq(apiRequests.environment, env)))
      .orderBy(desc(apiRequests.createdAt))
      .limit(200),
    db
      .select({
        total: count(),
        successes: sql<number>`count(*) filter (where ${apiRequests.statusCode} >= 200 and ${apiRequests.statusCode} < 400)`,
      })
      .from(apiRequests)
      .where(and(eq(apiRequests.userId, session.user.id), eq(apiRequests.environment, env))),
  ])

  const totalCount = Number(totalRow[0]?.total ?? rows.length)
  const totalSuccesses = Number(totalRow[0]?.successes ?? 0)
  const overallSuccessRate =
    totalCount > 0 ? ((totalSuccesses / totalCount) * 100).toFixed(1) : null

  const routingSamples = rows
    .map((r) => Number(r.routingLatencyMs ?? r.latencyMs))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 2000)

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <DashboardPageHeader
          title={env === "test" ? "Request Telemetry (Test Mode)" : "Request Telemetry (Live Mode)"}
          description={
            env === "test"
              ? "Real-time HTTP audit log and gateway latency traces for sandbox requests."
              : "Real-time HTTP audit log and gateway latency traces for live production requests."
          }
          backHref="/dashboard"
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <TelemetryMetricCard
            label="Recorded calls"
            value={String(totalCount)}
            hint={
              totalCount > 200 ? `Showing latest 200 of ${totalCount}` : "All recorded requests"
            }
            color="violet"
          />
          <TelemetryMetricCard
            label="Routing P95"
            value={routingSamples.length ? `${percentile(routingSamples, 95)} ms` : "—"}
            hint={
              routingSamples.length
                ? `P50 ${percentile(routingSamples, 50)} ms · max ${Math.max(...routingSamples)} ms`
                : "Awaiting latency samples"
            }
            color="orange"
          />
          <TelemetryMetricCard
            label="Success rate"
            value={overallSuccessRate !== null ? `${overallSuccessRate}%` : "—"}
            hint="HTTP 2xx & 3xx across all requests"
            color="emerald"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="text-base font-medium text-foreground">
                Routing latency (24h)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <LatencyDistributionChart requests={rows} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="text-base font-medium text-foreground">
                HTTP status distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <StatusSettlementDistributionChart requests={rows} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border p-5">
            <CardTitle className="text-base font-medium text-foreground">
              Request audit log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveRequestTelemetryTable initialRequests={rows} />
          </CardContent>
        </Card>
      </main>
    </ControlPlaneShell>
  )
}
