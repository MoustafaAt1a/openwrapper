import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft, Terminal, Activity, CheckCircle2, Clock3 } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiRequests } from "@/lib/db/schema"
import { formatDate } from "@/lib/utils"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function RequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select()
    .from(apiRequests)
    .where(eq(apiRequests.userId, session.user.id))
    .orderBy(desc(apiRequests.createdAt))
    .limit(100)

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
                <Terminal className="size-3.5" /> API Sandbox
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
              Latest 100 API calls
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

        {/* Telemetry Table */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Live Telemetry Stream</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Timestamp, HTTP method, route, latency, and status code for each call.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {rows.length} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-12 text-center">
                <Activity className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No API calls recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Send your first payment request or run health probes in the interactive sandbox.
                </p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/documentation">Open API Sandbox</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 hover:bg-transparent">
                      <TableHead className="font-mono text-[11px]">Method</TableHead>
                      <TableHead className="font-mono text-[11px]">Endpoint</TableHead>
                      <TableHead className="font-mono text-[11px]">Status</TableHead>
                      <TableHead className="font-mono text-[11px]">Latency</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              row.method === "POST"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border/80"
                            }`}
                          >
                            {row.method}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-foreground">{row.endpoint}</TableCell>
                        <TableCell>
                          <span
                            className={`font-mono text-xs font-bold ${
                              row.statusCode >= 400
                                ? "text-destructive"
                                : row.statusCode === 201
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {row.statusCode}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.latencyMs} ms
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">
                          <span suppressHydrationWarning>{formatDate(row.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
