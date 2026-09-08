import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { EnterpriseAuthShell } from "@/components/enterprise-auth-shell"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Log In — OpenWrapper",
  description: "Authenticate to your OpenWrapper payment gateway merchant portal.",
}

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")
  return <EnterpriseAuthShell mode="login" />
}
