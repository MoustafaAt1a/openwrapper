import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { ArrowLeft, KeyRound, Shield, ShieldCheck } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { ensureDatabaseSchema } from "@/lib/db/init"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeyManager } from "@/components/api-key-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ApiKeysPage() {
  await ensureDatabaseSchema()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(desc(apiKeys.createdAt))

  const activeKeys = keys.filter((key) => !key.revokedAt)

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto flex max-w-5xl animate-rise flex-col gap-8">
        {/* Header Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Security & Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            API Key Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Cryptographic bearer tokens for SDK and REST gateway access. Secret keys are SHA-256 hashed and shown only once upon creation.
          </p>
        </div>

        {/* Credentials Card */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Active Workspace Keys</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Use separate keys for staging and production workloads.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {activeKeys.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ApiKeyManager keys={activeKeys} />
          </CardContent>
        </Card>

        {/* Security Guidelines Box */}
        <Card className="border border-border/80 bg-card/60 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground flex flex-col gap-2 font-mono">
            <p>
              1. Never expose your API keys in frontend client bundles (React, Vue, mobile apps). Always call OpenWrapper endpoints from a secure backend server.
            </p>
            <p>
              2. Pass the token as a Bearer authorization header: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">Authorization: Bearer opw_live_...</code>
            </p>
          </CardContent>
        </Card>
      </main>
    </DashboardShell>
  )
}
