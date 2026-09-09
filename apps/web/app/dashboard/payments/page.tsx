import { CreditCard } from "lucide-react"
import { and, count, desc, eq, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { TelemetryMetricCard } from "@/components/dashboard/telemetry-metric-card"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { AuthoritativeTransactionLedgerTable } from "@/components/dashboard/authoritative-transaction-ledger-table"
import { WebhookDeliveryAuditTable } from "@/components/dashboard/webhook-delivery-audit-table"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { getMerchantSettings } from "@/lib/merchant-settings-service"
import { getStripeClient } from "@/lib/stripe-rail"
import { formatMinorUnits } from "@/lib/utils"

export default async function PaymentsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"
  const userId = session.user.id

  const [settings, rows, aggregates, webhooks] = await Promise.all([
    getMerchantSettings(userId, session.user.name, session.user.email),
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
        pending: sql<number>`count(*) filter (where ${payments.status} = 'pending' or (${payments.status} = 'unknown' and (${payments.nextActionType} is not null or ${payments.nextActionPayload} is not null)))`,
      })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.environment, env))),
    db
      .select({
        eventId: webhookEvents.eventId,
        provider: webhookEvents.provider,
        paymentId: webhookEvents.paymentId,
        payloadJson: webhookEvents.payloadJson,
        signature: webhookEvents.signature,
        receivedAt: webhookEvents.receivedAt,
      })
      .from(webhookEvents)
      .innerJoin(payments, eq(webhookEvents.paymentId, payments.id))
      .where(and(eq(payments.userId, userId), eq(payments.environment, env)))
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(50),
  ])

  // Proactive background reconciliation for recent pending Stripe checkouts
  if (process.env.STRIPE_SECRET_KEY) {
    const pendingStripe = rows.filter(
      (r) =>
        r.status === "pending" &&
        r.provider === "stripe" &&
        typeof r.providerReference === "string" &&
        r.providerReference.startsWith("cs_"),
    )
    if (pendingStripe.length > 0) {
      try {
        const stripeClient = getStripeClient()
        await Promise.all(
          pendingStripe.slice(0, 5).map(async (p) => {
            try {
              const session = await stripeClient.checkout.sessions.retrieve(p.providerReference!)
              if (session.payment_status === "paid" || session.status === "complete") {
                p.status = "succeeded"
                p.nextActionType = null
                p.nextActionPayload = null
                await db
                  .update(payments)
                  .set({
                    status: "succeeded",
                    nextActionType: null,
                    nextActionPayload: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(payments.id, p.id))
              } else if (session.status === "expired") {
                p.status = "failed"
                p.nextActionType = null
                p.nextActionPayload = null
                await db
                  .update(payments)
                  .set({
                    status: "failed",
                    nextActionType: null,
                    nextActionPayload: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(payments.id, p.id))
              }
            } catch {
              // Ignore individual lookup errors
            }
          }),
        )
      } catch {
        // Ignore initialization error
      }
    }
  }

  const agg = aggregates[0] ?? { total: 0, settled: 0, settledVolume: 0, pending: 0 }
  const currency = settings.currency || "EGP"
  const formatCurrency = (minor: number) => formatMinorUnits(minor, currency)

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-7xl animate-rise flex-col gap-8">
        <DashboardPageHeader
          title={env === "test" ? "Payments (Test Mode)" : "Payments (Live Mode)"}
          description={
            env === "test"
              ? "Sandbox payment ledger across Paymob, Fawry, Stripe, and Mock rails."
              : "Authoritative production ledger across Paymob, Fawry, and Stripe."
          }
          backHref="/dashboard"
          actions={
            <Button size="sm" variant="outline" pill asChild className="shadow-2xs">
              <Link href="/dashboard/documentation">
                <CreditCard className="w-4 h-4" />
                <span>Test Payment</span>
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <TelemetryMetricCard
            label="Total records"
            value={String(Number(agg.total))}
            hint="All recorded transactions"
            color="violet"
          />
          <TelemetryMetricCard
            label="Settled volume"
            value={formatCurrency(Number(agg.settledVolume))}
            hint={`${agg.settled} succeeded payments`}
            color="emerald"
          />
          <TelemetryMetricCard
            label="Pending settlement"
            value={String(Number(agg.pending))}
            hint="Awaiting customer action"
            color="orange"
          />
        </section>

        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border p-5">
            <CardTitle className="text-base font-medium text-foreground">
              Transaction ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AuthoritativeTransactionLedgerTable initialPayments={rows} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border p-5">
            <CardTitle className="text-base font-medium text-foreground">
              Webhook deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <WebhookDeliveryAuditTable initialWebhooks={webhooks} />
          </CardContent>
        </Card>
      </main>
    </ControlPlaneShell>
  )
}
