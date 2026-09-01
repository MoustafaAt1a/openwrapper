import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, CreditCard } from "lucide-react"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/dashboard-data"
import { normalizePaymentStatus, paymentHasNextAction } from "@/lib/payment-persist"
import { formatDate } from "@/lib/utils"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeyManager } from "@/components/api-key-manager"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { ProviderMixChart } from "@/components/dashboard/provider-mix-chart"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { VolumeTrendChart } from "@/components/dashboard/volume-trend-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const data = await getDashboardData(session.user.id)
  const m = data.metrics

  const formatCurrency = (minor: number) =>
    new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(
      minor / 100
    )

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
          <MetricCard label="Settled volume" value={formatCurrency(m.settledVolumeMinor)} hint="Succeeded payments only" />
          <MetricCard
            label="Initiated payments"
            value={String(m.totalPayments)}
            hint={`${m.pendingPayments} pending action`}
          />
          <MetricCard
            label="API success (24h)"
            value={`${m.apiSuccessRate24h.toFixed(1)}%`}
            hint="POST /api/v1/payments"
          />
          <MetricCard
            label="Routing P95"
            value={`${m.routingLatencyP95} ms`}
            hint={`P50 ${m.routingLatencyP50} ms · excl. provider RTT`}
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

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="border border-border">
            <CardHeader className="flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-base font-semibold">Recent transactions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/payments">
                  View all <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.slice(0, 6).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id.slice(0, 12)}…</TableCell>
                        <TableCell className="capitalize text-sm">{p.provider}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={normalizePaymentStatus(p.status, paymentHasNextAction(p))}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {(p.amountMinorUnits / 100).toFixed(2)} {p.currency}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          <span suppressHydrationWarning>{formatDate(p.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border p-5">
            <ProviderMixChart data={m.providerMix} />
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
