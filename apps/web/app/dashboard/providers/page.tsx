import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { ProviderMatrixConsole } from "@/components/provider-matrix-console"
import { auth } from "@/lib/auth"

import { resolveGatewayOrigin, resolvePublicOrigin } from "@/lib/public-origin-resolver"

export const metadata = {
  title: "Payment Providers & Rails — OpenWrapper",
  description: "Configure multi-gateway stateless routing for Paymob, Fawry, and Stripe.",
}

export default async function ProvidersPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host")
  const proto =
    reqHeaders.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http")
  const origin = resolvePublicOrigin(host, proto)
  const gatewayOrigin = resolveGatewayOrigin()

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto max-w-6xl animate-rise">
        <ProviderMatrixConsole origin={origin} gatewayOrigin={gatewayOrigin} />
      </main>
    </ControlPlaneShell>
  )
}
