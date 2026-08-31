import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft, CreditCard, ExternalLink, RefreshCw, Search, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payments, webhookEvents } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { formatDate } from "@/lib/utils"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function PaymentsPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, session.user.id))
    .orderBy(desc(payments.createdAt))
    .limit(100)

  const webhooks = await db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(10)

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
                <CreditCard className="size-3.5" /> Test Create Payment
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

        {/* Payments Table Card */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Transaction Ledger</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Every payment preserves upstream provider references and lossless next-actions.
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
                <CreditCard className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No payments created yet</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Trigger a payment creation using your API key or the interactive documentation sandbox.
                </p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/documentation">Go to API Sandbox</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 hover:bg-transparent">
                      <TableHead className="font-mono text-[11px]">Payment ID</TableHead>
                      <TableHead className="font-mono text-[11px]">Provider</TableHead>
                      <TableHead className="font-mono text-[11px]">Status</TableHead>
                      <TableHead className="font-mono text-[11px]">Amount</TableHead>
                      <TableHead className="font-mono text-[11px]">Merchant Ref</TableHead>
                      <TableHead className="font-mono text-[11px]">Next Action</TableHead>
                      <TableHead className="font-mono text-[11px]">Customer</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {row.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize font-mono text-[10px] border-border/80">
                            {row.provider}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                              row.status === "succeeded"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : row.status === "failed"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            <span className="size-1 rounded-full bg-current" />
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-foreground">
                          {(row.amountMinorUnits / 100).toFixed(2)} {row.currency}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.merchantReference || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.nextActionType === "pay_at_reference" ? (
                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-[11px]">
                              Code: {row.nextActionPayload}
                            </span>
                          ) : row.nextActionType === "redirect_to_url" ? (
                            <a
                              href={row.nextActionPayload || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                            >
                              Checkout <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.customerPhone || row.customerEmail || "Anonymous"}
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

        {/* Webhook Audit Log */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Recent Webhook Deliveries</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Incoming signature-verified webhook dispatches from Paymob, Fawry, and Stripe.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {webhooks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center font-mono">No webhook events delivered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 hover:bg-transparent">
                      <TableHead className="font-mono text-[11px]">Event ID</TableHead>
                      <TableHead className="font-mono text-[11px]">Provider</TableHead>
                      <TableHead className="font-mono text-[11px]">Linked Payment ID</TableHead>
                      <TableHead className="text-right font-mono text-[11px]">Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((w) => (
                      <TableRow key={w.eventId} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs text-foreground font-medium">{w.eventId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize font-mono text-[10px]">
                            {w.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {w.paymentId || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          <span suppressHydrationWarning>{formatDate(w.receivedAt)}</span>
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
