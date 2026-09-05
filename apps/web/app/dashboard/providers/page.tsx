import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProvidersClient } from "@/components/providers-client"
import { auth } from "@/lib/auth"

import { resolveGatewayOrigin, resolvePublicOrigin } from "@/lib/origin"

export const metadata = {
  title: "Payment Providers & Rails — OpenWrapper",
  description: "Configure multi-gateway stateless routing for Paymob, Fawry, and Stripe.",
}

export default async function ProvidersPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) redirect("/sign-in")

  const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host")
  const proto =
    reqHeaders.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http")
  const origin = resolvePublicOrigin(host, proto)
  const gatewayOrigin = resolveGatewayOrigin()

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto max-w-6xl animate-rise">
        <ProvidersClient origin={origin} gatewayOrigin={gatewayOrigin} />
      </main>
    </DashboardShell>
  )
}
