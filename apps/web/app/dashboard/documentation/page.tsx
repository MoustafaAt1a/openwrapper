import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
          description="Authenticate with Authorization: Bearer <api_key>. All amounts are discrete integer minor units."
        />

        {/* Official Client SDKs Quick Cards */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                  Official Client SDKs
                </CardTitle>
                <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mt-0.5">
                  Install officially maintained packages across TypeScript, PHP, and .NET. Click any
                  SDK for its full guide.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-[#533afd] dark:text-[#8c82fc] border-[#533afd]/20 bg-[#533afd]/10 shrink-0 self-start sm:self-auto rounded-full"
              >
                v0.1.3 LTS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/documentation/sdk/typescript"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/30 p-4 hover:border-[#533afd]/50 hover:bg-[#533afd]/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] group-hover:text-[#533afd] dark:group-hover:text-[#8c82fc] transition-colors">
                    TypeScript / Node
                  </span>
                  <span className="text-[10px] font-mono text-[#533afd] dark:text-[#8c82fc] flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white select-all">
                  npm i @openwrapper/sdk
                </code>
                <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-light">
                  Full type safety, fetch retries, and Bun runtime support.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/documentation/sdk/php"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/30 p-4 hover:border-[#533afd]/50 hover:bg-[#533afd]/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] group-hover:text-[#533afd] dark:group-hover:text-[#8c82fc] transition-colors">
                    PHP 8.1+
                  </span>
                  <span className="text-[10px] font-mono text-[#533afd] dark:text-[#8c82fc] flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white select-all">
                  composer require openwrapper/sdk
                </code>
                <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-light">
                  PSR-4, curl transport, and defensive null-safe wire parsing.
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/documentation/sdk/dotnet"
              className="group flex flex-col justify-between gap-2.5 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/30 p-4 hover:border-[#533afd]/50 hover:bg-[#533afd]/5 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] group-hover:text-[#533afd] dark:group-hover:text-[#8c82fc] transition-colors">
                    .NET 8 / C#
                  </span>
                  <span className="text-[10px] font-mono text-[#533afd] dark:text-[#8c82fc] flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    Full Guide <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
                  </span>
                </div>
                <code className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white select-all">
                  dotnet add package OpenWrapper
                </code>
                <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-light">
                  Async/await, nullable reference types, and HttpClientFactory.
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Interactive Comprehensive SDK Guide */}
        <SdkGuideClient initialSdk="typescript" />

        {/* REST API Endpoints Reference */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              REST Endpoints
            </CardTitle>
            <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mt-0.5">
              OpenWrapper v0.1.3 REST API specification
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 p-5">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="flex flex-col gap-2 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/20 p-3.5 sm:flex-row sm:items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      endpoint.method === "POST"
                        ? "bg-[#533afd]/10 text-[#533afd] dark:text-[#8c82fc] border-[#533afd]/20"
                        : "bg-black/5 dark:bg-white/5 text-[#64748d] dark:text-[#8ca3ba] border-black/10 dark:border-white/10"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white sm:w-64">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light sm:text-right">
                  {endpoint.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Interactive Sandbox */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
              Live Sandbox
            </CardTitle>
            <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mt-0.5">
              Run live requests and copy SDK snippets (TypeScript, PHP, .NET, cURL).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <ApiExplorer />
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
