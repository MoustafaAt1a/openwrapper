import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, Sparkles, Terminal } from "lucide-react"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiExplorer } from "@/components/api-explorer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/health",
    description: "Verify database connectivity, active providers, and gateway bridge status.",
  },
  {
    method: "POST",
    path: "/api/v1/payments",
    description:
      "Initiate payment across Paymob, Fawry, or Stripe. Requires Idempotency-Key header.",
  },
  {
    method: "GET",
    path: "/api/v1/payments",
    description: "List paginated workspace payment records with status and provider metadata.",
  },
  {
    method: "GET",
    path: "/api/v1/payments/:id",
    description: "Retrieve an owner-scoped payment record with lossless next-actions.",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/:provider",
    description: "Normalized signature-verified webhook ingestion for Paymob, Fawry, and Stripe.",
  },
]

export default async function DocumentationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-6xl animate-rise flex-col gap-8">
        {/* Header Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Developer Reference
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            API Reference & Interactive Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Authenticate requests using standard HTTP headers:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              Authorization: Bearer &lt;api_key&gt;
            </code>
            . Amounts are strictly integer minor units (piasters / cents) to prevent floating-point inaccuracies.
          </p>
        </div>

        {/* Endpoints Reference Table */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Versioned REST API Endpoints</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Conforms strictly to OpenAPI 3.1 specifications (OpenWrapper v0.1.1 LTS).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 pt-5">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:flex-row sm:items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      endpoint.method === "POST"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border/80"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-xs font-semibold text-foreground sm:w-64">{endpoint.path}</code>
                </div>
                <p className="text-xs text-muted-foreground sm:text-right">{endpoint.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Interactive Explorer Card */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">Interactive API Sandbox</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Run live tests directly against your workspace and generate ready-to-use SDK code.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <ApiExplorer />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
