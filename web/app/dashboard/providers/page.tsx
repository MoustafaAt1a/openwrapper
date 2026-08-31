import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CheckCircle2, Copy, Globe, HelpCircle, Shield, Sliders, Zap } from "lucide-react"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ProvidersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const origin =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const providerRails = [
    {
      name: "Paymob",
      region: "Egypt / MENA",
      methods: "Cards, Mobile Wallets, Kiosk",
      status: Boolean(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY)
        ? "Configured (Live)"
        : "Sandbox / Fallback Mode",
      isLive: Boolean(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY),
      webhookPath: "/api/v1/webhooks/paymob",
      security: "HMAC-SHA512 Verification",
      docsUrl: "https://accept.paymob.com/docs",
    },
    {
      name: "Fawry",
      region: "Egypt",
      methods: "Pay-at-Reference, Retail Outlets",
      status: Boolean(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECURE_KEY)
        ? "Configured (Live)"
        : "Sandbox / Fallback Mode",
      isLive: Boolean(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECURE_KEY),
      webhookPath: "/api/v1/webhooks/fawry",
      security: "SHA-256 Message Signature",
      docsUrl: "https://developer.fawry.com",
    },
    {
      name: "Stripe",
      region: "Global",
      methods: "Checkout Sessions, Apple Pay, Google Pay",
      status: Boolean(process.env.STRIPE_SECRET_KEY) ? "Configured (Live)" : "Sandbox / Fallback Mode",
      isLive: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookPath: "/api/v1/webhooks/stripe",
      security: "Stripe-Signature Timestamped Hash",
      docsUrl: "https://stripe.com/docs",
    },
    {
      name: "Deterministic Sandbox",
      region: "Local / Testing",
      methods: "Mock Paymob & Mock Fawry Simulator",
      status: "Always Ready",
      isLive: true,
      webhookPath: "/api/v1/webhooks/paymob",
      security: "Auto-approved testing responses",
      docsUrl: "#",
    },
  ]

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-6xl animate-rise flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Payment Infrastructure
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Payment providers & rails</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            OpenWrapper abstracts multi-provider complexity behind one deterministic interface.
            Configure merchant credentials via environment variables or test immediately with the built-in sandbox.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {providerRails.map((rail) => (
            <Card key={rail.name} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {rail.name}
                      {rail.isLive ? (
                        <span className="size-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="size-2 rounded-full bg-amber-500" />
                      )}
                    </CardTitle>
                    <CardDescription>{rail.region} • {rail.methods}</CardDescription>
                  </div>
                  <Badge variant={rail.isLive ? "secondary" : "outline"} className="font-mono text-xs">
                    {rail.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Webhook Destination URL
                  </span>
                  <code className="font-mono text-xs break-all select-all text-primary font-medium">
                    {origin}{rail.webhookPath}
                  </code>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <span className="flex items-center gap-1.5">
                    <Shield className="size-3.5 text-primary" /> {rail.security}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-500" /> Lossless next-actions
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Webhook integration guidelines</CardTitle>
            <CardDescription>
              Point your merchant dashboards to OpenWrapper webhook endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
            <p>
              OpenWrapper validates provider signatures before applying state machine transitions.
              When a webhook delivery arrives, the transaction transitions deterministically from
              <code className="mx-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">pending</code>
              to
              <code className="mx-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">succeeded</code>
              or
              <code className="mx-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">failed</code>,
              and is logged to the webhook audit ledger.
            </p>
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
