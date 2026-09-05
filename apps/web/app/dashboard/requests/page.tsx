import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { LatencyTrendChart } from "@/components/dashboard/latency-trend-chart"
import { LiveTelemetryTable } from "@/components/dashboard/live-telemetry-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart"
import { DashboardShell } from "@/components/dashboard-shell"
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
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select()
    .from(apiRequests)
    .where(eq(apiRequests.userId, session.user.id))
    .orderBy(desc(apiRequests.createdAt))
    .limit(200)

  const routingSamples = rows
    .map((r) => Number(r.routingLatencyMs ?? r.latencyMs))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 2000)

  const successCount = rows.filter((r) => r.statusCode >= 200 && r.statusCode < 400).length

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <PageHeader
          title="Request telemetry"
          description="Real-time HTTP audit log and gateway latency traces for your workspace."
          backHref="/dashboard"
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Recorded calls"
            value={String(rows.length)}
            hint="Latest 200 requests"
            color="violet"
          />
          <MetricCard
            label="Routing P95"
            value={routingSamples.length ? `${percentile(routingSamples, 95)} ms` : "—"}
            hint={
              routingSamples.length
                ? `P50 ${percentile(routingSamples, 50)} ms · max ${Math.max(...routingSamples)} ms`
                : "Awaiting latency samples"
            }
            color="orange"
          />
          <MetricCard
            label="Success rate"
            value={rows.length ? `${((successCount / rows.length) * 100).toFixed(1)}%` : "—"}
            hint="HTTP 2xx & 3xx status codes"
            color="emerald"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
            <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
              <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                Routing latency (24h)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <LatencyTrendChart requests={rows} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
            <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
              <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                HTTP status distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <StatusDistributionChart requests={rows} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              Request audit log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveTelemetryTable initialRequests={rows} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
