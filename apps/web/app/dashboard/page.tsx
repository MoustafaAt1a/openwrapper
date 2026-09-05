import { ArrowRight01Icon, CreditCardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
          description="Payment volume, multi-rail health, and live credentials at a glance."
          actions={
            <Button
              size="sm"
              variant="outline"
              asChild
              className="rounded-full border-[#e3e8ee] dark:border-white/10 bg-white/80 dark:bg-[#111630]/80 shadow-2xs hover:bg-[#f6f9fc] dark:hover:bg-white/10"
            >
              <Link href="/dashboard/payments">
                <HugeiconsIcon icon={CreditCardIcon} size={15} />
                <span>Transactions</span>
              </Link>
            </Button>
          }
        />

        {/* 4 Precision Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPI overview">
          <MetricCard
            label="Settled volume"
            value={formatCurrency(m.settledVolumeMinor)}
            hint="Succeeded payments only"
            color="emerald"
          />
          <MetricCard
            label="Initiated payments"
            value={String(m.totalPayments)}
            hint={`${m.pendingPayments} awaiting action`}
            color="violet"
          />
          <MetricCard
            label="API success rate"
            value={m.apiSuccessRate24h !== null ? `${m.apiSuccessRate24h.toFixed(1)}%` : "—"}
            hint={m.apiSuccessRate24h !== null ? "POST /v1/payments (24h)" : "No requests in 24h"}
            color="blue"
          />
          <MetricCard
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
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg font-light tracking-tight text-[#0d253d] dark:text-white">
              Volume & errors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <VolumeTrendChart weeklyData={data.weeklyChart} monthlyData={data.monthlyChart} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Recent Transactions Card */}
          <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
              <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                Recent transactions
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="rounded-full text-xs font-mono">
                <Link href="/dashboard/payments" className="flex items-center gap-1">
                  <span>View all</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#64748d] dark:text-[#8ca3ba] font-light">
                  No transactions yet. Create a payment via SDK or the checkout demo.
                </p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-[#e3e8ee]/80 dark:border-white/10">
                        <TableHead className="w-[140px] pl-5 font-mono text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
                          Payment ID
                        </TableHead>
                        <TableHead className="w-[80px] text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
                          Rail
                        </TableHead>
                        <TableHead className="w-[90px] text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
                          Status
                        </TableHead>
                        <TableHead className="w-[100px] text-right text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
                          Amount
                        </TableHead>
                        <TableHead className="w-[120px] pr-5 text-right text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
                          Created
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.slice(0, 6).map((p) => (
                        <TableRow
                          key={p.id}
                          className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors border-[#e3e8ee]/60 dark:border-white/5"
                        >
                          <TableCell className="pl-5 font-mono text-xs font-medium text-[#0d253d] dark:text-white">
                            <span className="block truncate max-w-[130px]" title={p.id}>
                              {p.id.slice(0, 8)}…{p.id.slice(-4)}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize text-xs font-medium text-[#64748d] dark:text-[#8ca3ba]">
                            {p.provider}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={normalizePaymentStatus(p.status, paymentHasNextAction(p))}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-[#0d253d] dark:text-white whitespace-nowrap">
                            {formatMinorUnits(p.amountMinorUnits, p.currency)}
                          </TableCell>
                          <TableCell className="pr-5 text-right text-xs text-[#64748d] dark:text-[#8ca3ba] whitespace-nowrap font-mono">
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

          {/* Rail Mix & Conversion Card */}
          <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs min-w-0">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
              <div>
                <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                  Rail mix & conversion
                </CardTitle>
                <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] mt-0.5 font-light">
                  Distribution and settlement efficiency across Paymob, Fawry, and Stripe
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-full text-xs font-mono">
                <Link href="/dashboard/providers" className="flex items-center gap-1">
                  <span>Providers</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6">
              <ProviderMixChart data={m.providerMix} />
              {m.providerMix.some((p) => p.count > 0) && (
                <div className="border-t border-[#e3e8ee]/80 dark:border-white/10 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] font-semibold mb-2">
                    Settlement Efficiency by Rail
                  </p>
                  <ProviderPerformanceChart data={m.providerMix} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* API Key Management Bento Section */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              API keys
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ApiKeyManager keys={data.keys} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
