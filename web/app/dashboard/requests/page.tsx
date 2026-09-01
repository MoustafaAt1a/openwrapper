import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiRequests } from "@/lib/db/schema"
import { DashboardShell } from "@/components/dashboard-shell"
import { LatencyTrendChart } from "@/components/dashboard/latency-trend-chart"
import { LiveTelemetryTable } from "@/components/dashboard/live-telemetry-table"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
          description="HTTP audit log for your workspace."
          backHref="/dashboard"
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Recorded" value={String(rows.length)} hint="Latest 200 requests" />
          <MetricCard
            label="Routing P95"
            value={`${percentile(routingSamples, 95)} ms`}
            hint={`P50 ${percentile(routingSamples, 50)} ms · max ${routingSamples.length ? Math.max(...routingSamples) : 0} ms`}
          />
          <MetricCard
            label="Success rate"
            value={rows.length ? `${((successCount / rows.length) * 100).toFixed(1)}%` : "—"}
            hint="HTTP 2xx & 3xx"
          />
        </section>

        <Card className="border border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">Routing latency (24h)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <LatencyTrendChart requests={rows} />
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">Request log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveTelemetryTable initialRequests={rows} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
