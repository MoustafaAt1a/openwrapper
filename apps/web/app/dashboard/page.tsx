import { ArrowRight, CreditCard } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ApiKeyManager } from "@/components/api-key-manager"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { ProviderMixChart } from "@/components/dashboard/provider-mix-chart"
import { ProviderPerformanceChart } from "@/components/dashboard/provider-performance-chart"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { VolumeTrendChart } from "@/components/dashboard/volume-trend-chart"
import { DashboardShell } from "@/components/dashboard-shell"
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
import { getDashboardData } from "@/lib/dashboard-data"
import { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-status"
import { formatDate, formatMinorUnits, formatShortDate } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const data = await getDashboardData(session.user.id)
  const m = data.metrics

  const formatCurrency = (minor: number) =>
    new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 2,
    }).format(minor / 100)

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <PageHeader
          title={`Welcome back, ${session.user.name.split(" ")[0]}`}
          description="Payment volume, API health, and credentials at a glance."
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/payments">
                <CreditCard className="size-3.5" /> Payments
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPI overview">
          <MetricCard
            label="Settled volume"
            value={formatCurrency(m.settledVolumeMinor)}
            hint="Succeeded payments only"
            shape={14}
            color="emerald"
          />
          <MetricCard
            label="Initiated payments"
            value={String(m.totalPayments)}
            hint={`${m.pendingPayments} pending action`}
            shape={28}
            color="violet"
          />
          <MetricCard
            label="API success (24h)"
            value={m.apiSuccessRate24h !== null ? `${m.apiSuccessRate24h.toFixed(1)}%` : "—"}
            hint={m.apiSuccessRate24h !== null ? "POST /api/v1/payments" : "No requests in 24h"}
            shape={47}
            color="blue"
          />
          <MetricCard
            label="Routing P95"
            value={m.routingLatencyP95 !== null ? `${m.routingLatencyP95} ms` : "—"}
            hint={
              m.routingLatencyP95 !== null
                ? `P50 ${m.routingLatencyP50} ms · excl. provider RTT`
                : "Awaiting telemetry samples"
            }
            shape={63}
            color="orange"
          />
        </section>

        <Card className="border border-border p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold">Volume & errors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <VolumeTrendChart weeklyData={data.weeklyChart} monthlyData={data.monthlyChart} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
              <CardTitle className="text-base font-semibold">Recent transactions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/payments">
                  View all <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No transactions yet. Create a payment via SDK or the checkout demo.
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[140px] pl-4 font-mono text-xs">
                          Payment ID
                        </TableHead>
                        <TableHead className="w-[80px] text-xs">Provider</TableHead>
                        <TableHead className="w-[90px] text-xs">Status</TableHead>
                        <TableHead className="w-[100px] text-right text-xs">Amount</TableHead>
                        <TableHead className="w-[120px] pr-4 text-right text-xs">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.slice(0, 6).map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="pl-4 font-mono text-xs font-semibold text-foreground">
                            <span className="block truncate max-w-[130px]" title={p.id}>
                              {p.id.slice(0, 8)}…{p.id.slice(-4)}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize text-xs font-medium text-muted-foreground">
                            {p.provider}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={normalizePaymentStatus(p.status, paymentHasNextAction(p))}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                            {formatMinorUnits(p.amountMinorUnits, p.currency)}
                          </TableCell>
                          <TableCell className="pr-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                            <span title={formatDate(p.createdAt)} suppressHydrationWarning>
                              {formatShortDate(p.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Rail mix & conversion</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribution and settlement efficiency across Paymob, Fawry, and Stripe
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/providers">
                  Providers <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6">
              <ProviderMixChart data={m.providerMix} />
              {m.providerMix.some((p) => p.count > 0) && (
                <div className="border-t border-border/70 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Settlement Efficiency by Rail
                  </p>
                  <ProviderPerformanceChart data={m.providerMix} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">API keys</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ApiKeyManager keys={data.keys} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
