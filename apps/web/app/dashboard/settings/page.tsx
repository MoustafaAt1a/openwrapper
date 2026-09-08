import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { MerchantSettingsConsole } from "@/components/merchant-settings-console"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Merchant Settings & Policy — OpenWrapper",
  description:
    "Configure merchant organization defaults, webhook signing secrets, and financial settlement currency.",
}

export default async function SettingsPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto max-w-5xl animate-rise">
        <MerchantSettingsConsole
          initialOrgName={`${session.user.name}'s Organization`}
          initialEmail={session.user.email}
        />
      </main>
    </ControlPlaneShell>
  )
}
