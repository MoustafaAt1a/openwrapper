import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ApiExplorer } from "@/components/api-explorer"
import { PageHeader } from "@/components/dashboard/page-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/health",
    description: "Database, providers, and gateway bridge status.",
  },
  {
    method: "POST",
    path: "/api/v1/payments",
    description: "Create a payment (Paymob, Fawry, or Stripe). Requires Idempotency-Key.",
  },
  {
    method: "GET",
    path: "/api/v1/payments/:id",
    description: "Retrieve a payment by ID.",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/:provider",
    description: "Webhook ingestion for Paymob, Fawry, and Stripe.",
  },
]

export default async function DocumentationPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-6xl animate-rise flex-col gap-8">
        <PageHeader
          title="API Explorer"
          description="Authenticate with Authorization: Bearer <api_key>. Amounts are integer minor units."
        />

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold">Endpoints</CardTitle>
            <CardDescription className="text-xs">OpenWrapper v0.1.3 REST API</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 pt-5">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:flex-row sm:items-center justify-between"
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
                  <code className="font-mono text-xs font-semibold text-foreground sm:w-64">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground sm:text-right">
                  {endpoint.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold">
              Official SDKs & Monorepo Tooling
            </CardTitle>
            <CardDescription className="text-xs">
              Install officially maintained packages or run monorepo synchronization commands.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                TypeScript / Node
              </span>
              <code className="font-mono text-xs font-semibold text-foreground select-all">
                npm i @openwrapper/sdk
              </code>
              <p className="text-[11px] text-muted-foreground">
                Full type safety, fetch retries, and Bun runtime support.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                PHP 8.1+
              </span>
              <code className="font-mono text-xs font-semibold text-foreground select-all">
                composer require openwrapper/sdk
              </code>
              <p className="text-[11px] text-muted-foreground">
                PSR-4, curl transport, and defensive null-safe wire parsing.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                .NET 8 / C#
              </span>
              <code className="font-mono text-xs font-semibold text-foreground select-all">
                dotnet add package OpenWrapper
              </code>
              <p className="text-[11px] text-muted-foreground">
                Async/await, nullable reference types, and HttpClientFactory.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Monorepo Release Tool
              </span>
              <code className="font-mono text-xs font-semibold text-foreground select-all">
                bun run version:check
              </code>
              <p className="text-[11px] text-muted-foreground">
                Validates all 11 manifests across Rust, npm, PHP, and NuGet.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold">Sandbox</CardTitle>
            <CardDescription className="text-xs">
              Run live requests and copy SDK snippets (TypeScript, PHP, .NET, cURL).
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
