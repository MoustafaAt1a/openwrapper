import { ShieldCheck } from "lucide-react"
import { desc, eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { CredentialVaultManager } from "@/components/credential-vault-manager"
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiKeyEnvironment } from "@/lib/api-key-service"
import { auth } from "@/lib/auth"
import { CodeBlock } from "@/lib/code-syntax-highlighter"
import { db } from "@/lib/db"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { apiKeys } from "@/lib/db/schema"

export default async function ApiKeysPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  // Fetch API keys belonging to the current authenticated user:
  const userKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastFour: apiKeys.lastFour,
      environment: apiKeys.environment,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt))

  const activeKeys = userKeys
    .filter((key) => {
      const keyEnv = (key.environment as "live" | "test") || getApiKeyEnvironment(key.prefix)
      return keyEnv === env
    })
    .map((key) => ({
      ...key,
      environment: (key.environment as "live" | "test") || getApiKeyEnvironment(key.prefix),
    }))

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto flex max-w-5xl animate-rise flex-col gap-8">
        <DashboardPageHeader
          title="API Key Management"
          description="Cryptographic bearer tokens for SDK and REST gateway access. Choose between Live (production transactions) and Test (simulated sandbox) tokens."
          backHref="/dashboard"
        />

        {/* Credentials Card */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium text-foreground">
                  Active Workspace Keys
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-light">
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
            <CredentialVaultManager keys={activeKeys} />
          </CardContent>
        </Card>

        {/* Security Guidelines Box */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Environment & Security Best Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-xs leading-relaxed text-muted-foreground flex flex-col gap-2.5 font-mono">
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
            <div>
              <p className="mb-2">
                3. Never expose API keys in public client applications. Always authenticate
                server-to-server requests using the standard HTTP Authorization header:
              </p>
              <CodeBlock
                code={`# Authenticate REST gateway requests with your workspace key
curl -X GET "https://gateway.openwrapper.muejam.com/api/v1/health" \\
  -H "Authorization: Bearer ow_${env}_your_api_key_secret"`}
                language="bash"
                filename="auth_example.sh"
                showLineNumbers={false}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </ControlPlaneShell>
  )
}
