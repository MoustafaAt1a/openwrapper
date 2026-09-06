import { CreditCardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { and, count, desc, eq, inArray, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { TransactionLedgerTable } from "@/components/dashboard/transaction-ledger-table"
import { WebhookDeliveriesTable } from "@/components/dashboard/webhook-deliveries-table"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"

export default async function PaymentsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"
  const userId = session.user.id

  const [rows, aggregates, pendingRow, paymentIds] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.environment, env)))
      .orderBy(desc(payments.createdAt))
      .limit(200),
    db
      .select({
        total: count(),
        settled: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')`,
        settledVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}) filter (where ${payments.status} = 'succeeded'), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.environment, env))),
    db
      .select({ count: count() })
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.environment, env),
          sql`(${payments.status} = 'pending' OR (${payments.status} = 'unknown' AND (${payments.nextActionType} IS NOT NULL OR ${payments.nextActionPayload} IS NOT NULL)))`,
        ),
      ),
    db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.environment, env)))
      .limit(500),
  ])

  const ids = paymentIds.map((p) => p.id)
  const webhooks =
    ids.length > 0
      ? await db
          .select()
          .from(webhookEvents)
          .where(inArray(webhookEvents.paymentId, ids))
          .orderBy(desc(webhookEvents.receivedAt))
          .limit(50)
      : []

  const agg = aggregates[0] ?? { total: 0, settled: 0, settledVolume: 0 }
  const pending = Number(pendingRow[0]?.count ?? 0)
  const formatEgp = (minor: number) =>
    new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }).format(minor / 100)

  return (
    <DashboardShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <PageHeader
          title={env === "test" ? "Payments (Test Mode)" : "Payments (Live Mode)"}
          description={
            env === "test"
              ? "Sandbox payment ledger across Paymob, Fawry, Stripe, and Mock rails."
              : "Authoritative production ledger across Paymob, Fawry, and Stripe."
          }
          backHref="/dashboard"
          actions={
            <Button
              size="sm"
              variant="outline"
              asChild
              className="rounded-full border-[#e3e8ee] dark:border-white/10 bg-white/80 dark:bg-[#111630]/80 shadow-2xs hover:bg-[#f6f9fc] dark:hover:bg-white/10"
            >
              <Link href="/dashboard/documentation">
                <HugeiconsIcon icon={CreditCardIcon} size={15} />
                <span>Test Payment</span>
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total records"
            value={String(Number(agg.total))}
            hint="All recorded transactions"
            color="violet"
          />
          <MetricCard
            label="Settled volume"
            value={formatEgp(Number(agg.settledVolume))}
            hint={`${agg.settled} succeeded payments`}
            color="emerald"
          />
          <MetricCard
            label="Pending settlement"
            value={String(pending)}
            hint="Awaiting customer action"
            color="orange"
          />
        </section>

        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              Transaction ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionLedgerTable initialPayments={rows} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              Webhook deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <WebhookDeliveriesTable initialWebhooks={webhooks} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
