import { Info, Lock, ShieldCheck, Terminal } from "lucide-react"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { PaymentOrchestratorConsole } from "@/components/payment-orchestrator-console"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "API Explorer & REST Console — OpenWrapper",
  description:
    "Interactive API Explorer, live payment testing console, and REST endpoint specification for OpenWrapper.",
}

interface EndpointSpec {
  method: "GET" | "POST"
  path: string
  description: string
  auth: "Bearer Token" | "Public" | "Webhook HMAC"
  idempotency: boolean
  rateLimit: string
}

const endpoints: EndpointSpec[] = [
  {
    method: "GET",
    path: "/api/v1/health",
    description: "Inspect bridge health, connected database, and payment rail availability.",
    auth: "Public",
    idempotency: false,
    rateLimit: "120 req/min",
  },
  {
    method: "POST",
    path: "/api/v1/payments",
    description:
      "Initiate payment charge across Paymob, Fawry, or Stripe. Deduplicated via Idempotency-Key.",
    auth: "Bearer Token",
    idempotency: true,
    rateLimit: "60 req/min",
  },
  {
    method: "GET",
    path: "/api/v1/payments/:id",
    description: "Fetch canonical payment record by transaction ID including settlement status.",
    auth: "Bearer Token",
    idempotency: false,
    rateLimit: "120 req/min",
  },
  {
    method: "POST",
    path: "/api/v1/payments/:id/refunds",
    description:
      "Execute a full or partial refund with integer minor unit math. Enforces Idempotency-Key.",
    auth: "Bearer Token",
    idempotency: true,
    rateLimit: "60 req/min",
  },
  {
    method: "GET",
    path: "/api/v1/events",
    description:
      "Query immutable audit stream of transaction lifecycle events and status transitions.",
    auth: "Bearer Token",
    idempotency: false,
    rateLimit: "120 req/min",
  },
  {
    method: "POST",
    path: "/api/v1/webhook_endpoints",
    description: "Register outbound merchant webhook endpoints with HMAC-SHA256 signing secret.",
    auth: "Bearer Token",
    idempotency: true,
    rateLimit: "60 req/min",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/:provider",
    description:
      "Inbound provider webhook receiver. Verified against constant-time HMAC signatures.",
    auth: "Webhook HMAC",
    idempotency: true,
    rateLimit: "300 req/min",
  },
]

export default async function DocumentationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-6xl animate-rise flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <DashboardPageHeader
            title="API Explorer"
            description="Test live payment creation and gateway health directly from your browser. Copy production-ready SDK snippets in one click."
          />
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-primary border-primary/20 bg-primary/10 rounded-full px-3 py-1"
            >
              OpenAPI 3.1 · v0.2.7 LTS
            </Badge>
          </div>
        </div>

        {/* Live Interactive Sandbox (Flagship Component) */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Live Gateway Sandbox
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
                    Select a payment rail preset, tweak your payload, and execute live requests
                    against the engine.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <PaymentOrchestratorConsole />
          </CardContent>
        </Card>

        {/* REST API Endpoints Reference */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  REST Endpoints Specification
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
                  Canonical HTTP/1.1 routes supported by the OpenWrapper Axum gateway.
                </CardDescription>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {endpoints.length} Endpoints
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-primary/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        endpoint.method === "POST"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="font-mono text-xs font-semibold text-foreground">
                      {endpoint.path}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    {endpoint.idempotency && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        Idempotent
                      </span>
                    )}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground">
                      {endpoint.auth}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {endpoint.rateLimit}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {endpoint.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Integration Guidelines & Rules Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card/80 p-4.5 flex flex-col gap-2 stripe-card-shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Lock className="w-4 h-4 text-primary" />
              <span>Discrete Minor Units</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
              All currency amounts must be integer minor units (
              <code className="font-mono text-[10px]">amount_minor_units: i64</code>). Never send
              floating-point numbers.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-4.5 flex flex-col gap-2 stripe-card-shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Zero-Knowledge Secrets</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
              Provider credentials never touch the database. Send credentials via encrypted TLS
              headers or rely on ambient gateway configuration.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 p-4.5 flex flex-col gap-2 stripe-card-shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Info className="w-4 h-4 text-amber-500" />
              <span>Idempotent Retries</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
              Always pass <code className="font-mono text-[10px]">Idempotency-Key</code> on POST
              requests. Retrying identical payloads returns the cached transaction without
              re-execution.
            </p>
          </div>
        </div>
      </main>
    </ControlPlaneShell>
  )
}
