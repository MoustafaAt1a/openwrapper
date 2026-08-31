import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft, CreditCard } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TransactionLedgerTable } from "@/components/dashboard/transaction-ledger-table"
import { WebhookDeliveriesTable } from "@/components/dashboard/webhook-deliveries-table"

export default async function PaymentsPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, session.user.id))
    .orderBy(desc(payments.createdAt))
    .limit(200)

  const webhooks = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(50)

  const succeededCount = rows.filter((r) => r.status === "succeeded").length
  const totalVolume = rows.reduce((acc, r) => acc + (r.status === "succeeded" ? r.amountMinorUnits : 0), 0)

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
                Financial Ledger
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Payments & Transactions
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Immutable ledger of payment intentions across Paymob, Fawry, and Stripe.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs border-border/80 bg-card shadow-2xs"
              asChild
            >
              <Link href="/dashboard/documentation">
                <CreditCard className="size-3.5 mr-1" /> Test Create Payment
              </Link>
            </Button>
          </div>
        </div>

        {/* 3-Up Metric Summary Strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              TOTAL RECORDS
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">{rows.length}</p>
            <span className="font-mono text-[11px] text-muted-foreground mt-2 block">
              Logged transactions
            </span>
          </Card>
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SETTLED VOLUME
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">
              {(totalVolume / 100).toFixed(2)} EGP
            </p>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 block">
              ✓ Zero rounding error
            </span>
          </Card>
          <Card className="border border-border/80 bg-card p-5 shadow-2xs">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SETTLED COUNT
            </span>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-1">
              {succeededCount} payments
            </p>
            <span className="font-mono text-[11px] text-muted-foreground mt-2 block">
              {rows.length > 0 ? `${((succeededCount / rows.length) * 100).toFixed(1)}% success rate` : "Ready for traffic"}
            </span>
          </Card>
        </div>

        {/* Scrollable & Filterable Payments Table Card */}
        <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Transaction Ledger</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Filter by status or provider, search across IDs, and inspect next-action payloads.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionLedgerTable initialPayments={rows} />
          </CardContent>
        </Card>

        {/* Scrollable & Filterable Webhook Audit Log */}
        <Card className="border border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Recent Webhook Deliveries</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Incoming signature-verified webhook dispatches from Paymob, Fawry, and Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <WebhookDeliveriesTable initialWebhooks={webhooks} />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
