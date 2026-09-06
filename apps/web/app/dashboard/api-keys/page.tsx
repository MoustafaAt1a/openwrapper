import { ShieldCheckIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ApiKeyManager } from "@/components/api-key-manager"
import { PageHeader } from "@/components/dashboard/page-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiKeyEnvironment } from "@/lib/api-keys"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { apiKeys } from "@/lib/db/schema"

export default async function ApiKeysPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt))

  const activeKeys = keys
    .filter((key) => !key.revokedAt)
    .map((key) => ({
      ...key,
      environment: getApiKeyEnvironment(key.prefix),
    }))

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-5xl animate-rise flex-col gap-8">
        <PageHeader
          title="API Key Management"
          description="Cryptographic bearer tokens for SDK and REST gateway access. Choose between Live (production transactions) and Test (simulated sandbox) tokens."
          backHref="/dashboard"
        />

        {/* Credentials Card */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs overflow-hidden">
          <CardHeader className="border-b border-[#e3e8ee]/80 dark:border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium text-[#0d253d] dark:text-white">
                  Active Workspace Keys
                </CardTitle>
                <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light">
                  Segregate development sandbox requests (ow_test_) from live transactions
                  (ow_live_).
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] rounded-full px-2.5 py-0.5"
              >
                {activeKeys.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ApiKeyManager keys={activeKeys} />
          </CardContent>
        </Card>

        {/* Security Guidelines Box */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-[#0d253d] dark:text-white">
              <HugeiconsIcon icon={ShieldCheckIcon} size={16} className="text-emerald-500" />
              <span>Environment & Security Best Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-xs leading-relaxed text-[#64748d] dark:text-[#8ca3ba] flex flex-col gap-2.5 font-mono">
            <p>
              1.{" "}
              <strong>
                Test Mode (<code className="text-amber-600 dark:text-amber-400">ow_test_...</code>)
              </strong>
              : Simulates payment flows and routes safely to sandbox or mock rails without
              processing real financial transfers.
            </p>
            <p>
              2.{" "}
              <strong>
                Live Mode (
                <code className="text-emerald-600 dark:text-emerald-400">ow_live_...</code>)
              </strong>
              : Initiates real-money settlements through upstream processors (Paymob, Fawry,
              Stripe).
            </p>
            <p>
              3. Never expose API keys in public client applications. Always send requests through a
              secure server header:
              <br />
              <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[#0d253d] dark:text-white inline-block mt-1">
                Authorization: Bearer ow_test_... (Sandbox) / ow_live_... (Production)
              </code>
            </p>
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
