import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft, Terminal } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiRequests } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveTelemetryTable } from "@/components/dashboard/live-telemetry-table"

export default async function RequestsPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select()
    .from(apiRequests)
    .where(eq(apiRequests.userId, session.user.id))
    .orderBy(desc(apiRequests.createdAt))
    .limit(200)

  const avgLatency = rows.length
    ? Math.round(rows.reduce((acc, r) => acc + r.latencyMs, 0) / rows.length)
    : 0

  const successCount = rows.filter((r) => r.statusCode < 400).length

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-4" />
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Observability & Metrics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Request Telemetry & Logs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time audit stream of all HTTP requests processed by OpenWrapper.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs border-border/80 bg-card shadow-2xs"
              asChild
            >
              <Link href="/dashboard/documentation">
                <Terminal className="size-3.5 mr-1" /> API Sandbox
              </Link>
            </Button>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              RECORDED REQUESTS
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">{rows.length}</p>
            <span className="font-mono text-[11px] text-muted-foreground mt-2 block">
              Audited API calls
            </span>
          </Card>
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              AVERAGE LATENCY
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">
              {avgLatency} ms
            </p>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 block">
              ⚡ Ultra-fast routing
            </span>
          </Card>
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SUCCESSFUL RESPONSES
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">
              {rows.length ? `${((successCount / rows.length) * 100).toFixed(1)}%` : "100%"}
            </p>
            <span className="font-mono text-[11px] text-muted-foreground mt-2 block">
              HTTP 2xx & 3xx status codes
            </span>
          </Card>
        </div>

        {/* Scrollable & Filterable Telemetry Table */}
        <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Live Telemetry Stream</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Search by endpoint, filter by HTTP method or response status, and sort by response latency.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <LiveTelemetryTable initialRequests={rows} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
