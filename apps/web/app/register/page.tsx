import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { EnterpriseAuthShell } from "@/components/enterprise-auth-shell"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Create Merchant Account — OpenWrapper",
  description: "Get started with OpenWrapper sovereign payment rails and developer gateway.",
}

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")
  return <EnterpriseAuthShell mode="register" />
}
