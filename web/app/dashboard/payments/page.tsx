import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { and, count, desc, eq, inArray, sql } from "drizzle-orm"
import { CreditCard } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { DashboardShell } from "@/components/dashboard-shell"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { TransactionLedgerTable } from "@/components/dashboard/transaction-ledger-table"
import { WebhookDeliveriesTable } from "@/components/dashboard/webhook-deliveries-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function PaymentsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const userId = session.user.id

  const [rows, aggregates, pendingRow, paymentIds] = await Promise.all([
    db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(200),
    db
      .select({
        total: count(),
        settled: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')`,
        settledVolume: sql<number>`coalesce(sum(${payments.amountMinorUnits}) filter (where ${payments.status} = 'succeeded'), 0)`,
      })
      .from(payments)
      .where(eq(payments.userId, userId)),
    db
      .select({ count: count() })
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          sql`(${payments.status} = 'pending' OR (${payments.status} = 'unknown' AND (${payments.nextActionType} IS NOT NULL OR ${payments.nextActionPayload} IS NOT NULL)))`
        )
      ),
    db.select({ id: payments.id }).from(payments).where(eq(payments.userId, userId)).limit(500),
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
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <PageHeader
          title="Payments"
          description="Ledger across Paymob, Fawry, and Stripe."
          backHref="/dashboard"
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/documentation">
                <CreditCard className="size-3.5" /> Test payment
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Records" value={String(Number(agg.total))} hint="All payment rows" />
          <MetricCard label="Settled" value={formatEgp(Number(agg.settledVolume))} hint={`${agg.settled} succeeded`} />
          <MetricCard label="Pending" value={String(pending)} hint="Awaiting customer action" />
        </section>

        <Card className="border border-border overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">Transaction ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionLedgerTable initialPayments={rows} />
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">Webhook deliveries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <WebhookDeliveriesTable initialWebhooks={webhooks} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
