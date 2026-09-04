import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProvidersClient } from "@/components/providers-client"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Payment Providers & Rails — OpenWrapper",
  description: "Configure multi-gateway stateless routing for Paymob, Fawry, and Stripe.",
}

export default async function ProvidersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const origin =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
        ? "https://openwrapper.muejam.com"
        : "http://localhost:3000")

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto max-w-6xl animate-rise">
        <ProvidersClient origin={origin} />
      </main>
    </DashboardShell>
  )
}
