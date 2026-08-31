import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProvidersClient } from "@/components/providers-client"

export const metadata = {
  title: "Payment Providers & Rails — OpenWrapper",
  description: "Configure multi-gateway stateless routing for Paymob, Fawry, and Stripe.",
}

export default async function ProvidersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const headersList = await headers()
  const host =
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    process.env.BETTER_AUTH_URL?.replace(/^https?:\/\//, "") ||
    "web-production-884cd.up.railway.app"

  const proto =
    headersList.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https")

  const origin = `${proto}://${host}`

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto max-w-6xl animate-rise">
        <ProvidersClient origin={origin} />
      </main>
    </DashboardShell>
  )
}
