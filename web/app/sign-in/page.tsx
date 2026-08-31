import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthPage } from "@/components/auth-page"
import { auth } from "@/lib/auth"

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")
  return <AuthPage mode="sign-in" />
}
