import { ArrowRight } from "lucide-react"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ApiExplorer } from "@/components/api-explorer"
import { PageHeader } from "@/components/dashboard/page-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SdkGuideClient } from "@/components/sdk-guide-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "API Documentation & SDK Guides — OpenWrapper",
  description:
    "Complete integration documentation and client SDK guides for TypeScript, PHP, and .NET.",
}

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
          title="API Documentation & Client SDK Guides"
          description="Authenticate with Authorization: Bearer <api_key>. Amounts are integer minor units (e.g. 10000 = 100.00)."
        />

        {/* Official Client SDKs Quick Cards */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Official Client SDKs</CardTitle>
                <CardDescription className="text-xs">
                  Install officially maintained packages across TypeScript, PHP, and .NET. Click any
                  SDK for its full guide.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-primary border-primary/20 bg-primary/5 hidden sm:inline-flex"
              >
                v0.1.3 LTS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/documentation/sdk/typescript"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    TypeScript / Node
                  </span>
                  <span className="text-[10px] font-mono text-primary flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <ArrowRight className="size-2.5" />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-foreground select-all">
                  npm i @openwrapper/sdk
                </code>
                <p className="text-[11px] text-muted-foreground">
                  Full type safety, fetch retries, and Bun runtime support.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/documentation/sdk/php"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    PHP 8.1+
                  </span>
                  <span className="text-[10px] font-mono text-primary flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <ArrowRight className="size-2.5" />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-foreground select-all">
                  composer require openwrapper/sdk
                </code>
                <p className="text-[11px] text-muted-foreground">
                  PSR-4, curl transport, and defensive null-safe wire parsing.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/documentation/sdk/dotnet"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    .NET 8 / C#
                  </span>
                  <span className="text-[10px] font-mono text-primary flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <ArrowRight className="size-2.5" />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-foreground select-all">
                  dotnet add package OpenWrapper
                </code>
                <p className="text-[11px] text-muted-foreground">
                  Async/await, nullable reference types, and HttpClientFactory.
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Interactive Comprehensive SDK Guide */}
        <SdkGuideClient initialSdk="typescript" />

        {/* REST API Endpoints Reference */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold">REST Endpoints</CardTitle>
            <CardDescription className="text-xs">
              OpenWrapper v0.1.3 REST API specification
            </CardDescription>
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

        {/* Live Interactive Sandbox */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <CardTitle className="text-base font-semibold">Live Sandbox</CardTitle>
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
