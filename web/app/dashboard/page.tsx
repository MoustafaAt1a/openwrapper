import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  KeyRound,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/dashboard-data"
import { normalizePaymentStatus } from "@/lib/payment-persist"
import { formatDate } from "@/lib/utils"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeyManager } from "@/components/api-key-manager"
import { UsageChart } from "@/components/usage-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const data = await getDashboardData(session.user.id)

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2,
    }).format(minor / 100)
  }

  const metrics = [
    {
      title: "TOTAL REVENUE",
      value: formatCurrency(data.metrics.totalVolume),
      change: data.metrics.revenueChange,
      bars: data.metrics.volumeSparkline,
    },
    {
      title: "TOTAL ORDERS",
      value: `${data.metrics.totalPayments} Orders`,
      change: data.metrics.providerMix,
      bars: data.metrics.ordersSparkline,
    },
    {
      title: "SUCCESS RATE",
      value: `${data.metrics.successRate.toFixed(1)}%`,
      change: "Payment API success (24h)",
      bars: data.metrics.successSparkline,
    },
    {
      title: "AVG. LATENCY",
      value: `${data.metrics.latency} ms`,
      change: "Gateway routing (excl. provider RTT)",
      bars: data.metrics.latencySparkline,
    },
  ]

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        {/* Welcome Greeting & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Welcome back, {session.user.name.split(" ")[0]}
            </h1>
            <p className="text-xs font-mono text-muted-foreground">
              Real-time payment routing, multi-gateway telemetry, and active credentials.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-border/80 bg-card shadow-2xs"
              asChild
            >
              <Link href="/dashboard/documentation">API Sandbox</Link>
            </Button>
            <Button
              size="sm"
              className="font-mono text-xs shadow-2xs"
              asChild
            >
              <Link href="/dashboard/payments">
                <CreditCard className="size-3.5" /> All Payments
              </Link>
            </Button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPI overview">
          {metrics.map((m) => (
            <Card key={m.title} className="relative overflow-hidden border border-border/80 bg-card p-5 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.title}
                  </span>
                  <p className="font-mono text-2xl font-bold tracking-tight text-foreground">{m.value}</p>
                </div>

                {/* Mini Sparkline Bars */}
                <div className="flex items-end gap-1 h-8 pt-1">
                  {m.bars.map((h, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-xs bg-foreground/20 hover:bg-foreground transition-all"
                      style={{ height: `${Math.max(8, Math.min(30, h * 0.28))}px` }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>{m.change}</span>
              </div>
            </Card>
          ))}
        </section>

        {/* Main Sales Trend Chart Card */}
        <Card className="border border-border/80 bg-card p-6 shadow-2xs">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SALES & VOLUME TREND
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
                    {formatCurrency(data.metrics.totalVolume)}
                  </p>
                  <span className="font-mono text-xs text-muted-foreground">
                    Total settled volume
                  </span>
                </div>
              </div>
            </div>

            <UsageChart weeklyData={data.weeklyChart} monthlyData={data.monthlyChart} />
          </div>
        </Card>

        {/* Two-Column Section: Recent Payments & API Keys */}
        <div className="grid gap-8 lg:grid-cols-[1.4fr_.9fr]">
          {/* Recent Payments Ledger */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="flex-row items-center justify-between border-b border-border/80 pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Recent Transactions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest payments processed through Paymob, Fawry, or Stripe.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/dashboard/payments">
                  View all <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.payments.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-8 text-center">
                  <CreditCard className="size-6 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No transactions yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Issue an API key and send a test payment from the API Explorer tab.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/80">
                        <TableHead className="font-mono text-[11px]">ID</TableHead>
                        <TableHead className="font-mono text-[11px]">Provider</TableHead>
                        <TableHead className="font-mono text-[11px]">Status</TableHead>
                        <TableHead className="font-mono text-[11px]">Amount</TableHead>
                        <TableHead className="font-mono text-[11px]">Customer</TableHead>
                        <TableHead className="font-mono text-[11px] text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.slice(0, 6).map((p) => {
                        const displayStatus = normalizePaymentStatus(
                          p.status,
                          Boolean(p.nextActionType || p.nextActionPayload)
                        )
                        return (
                        <TableRow key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold text-foreground">{p.id.slice(0, 14)}...</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize font-mono text-[10px] border-border/80">
                              {p.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                displayStatus === "succeeded"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : displayStatus === "failed"
                                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span className="size-1 rounded-full bg-current" />
                              {displayStatus}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {(p.amountMinorUnits / 100).toFixed(2)} {p.currency}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {p.customerName || p.customerPhone || "Guest"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            <span suppressHydrationWarning>{formatDate(p.createdAt)}</span>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Key Credentials Box */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="border-b border-border/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">API Credentials</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Cryptographic tokens for SDK and gateway authentication.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {data.keys.length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <ApiKeyManager keys={data.keys} />
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardShell>
  )
}
