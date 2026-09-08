import { ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function EnterpriseAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const signUp = mode === "register"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email"))
    const password = String(form.get("password"))
    try {
      const result = signUp
        ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError("We could not complete that request. Check your details and try again.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("We could not reach the server. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup className="gap-4">
        {signUp && (
          <Field>
            <FieldLabel
              htmlFor="name"
              className="text-xs font-medium text-[#273951] dark:text-[#c2d1e0]"
            >
              Full name
            </FieldLabel>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              className="rounded-xl border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] h-10 text-sm focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/20"
            />
          </Field>
        )}
        <Field>
          <FieldLabel
            htmlFor="email"
            className="text-xs font-medium text-[#273951] dark:text-[#c2d1e0]"
          >
            Work email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-xl border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] h-10 text-sm focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/20"
          />
        </Field>
        <Field>
          <FieldLabel
            htmlFor="password"
            className="text-xs font-medium text-[#273951] dark:text-[#c2d1e0]"
          >
            Password
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={signUp ? "new-password" : "current-password"}
            required
            minLength={8}
            className="rounded-xl border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] h-10 text-sm focus:border-[#533afd] focus:ring-2 focus:ring-[#533afd]/20"
          />
        </Field>
      </FieldGroup>

      {error && <FieldError>{error}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-full font-medium text-sm bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-1"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Processing...</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span>{signUp ? "Create workspace" : "Sign in"}</span>
            <ArrowRight className="size-4" />
          </span>
        )}
      </button>

      <p className="text-center text-xs text-[#64748d] dark:text-[#8ca3ba]">
        {signUp ? "Already have an account?" : "New to OpenWrapper?"}{" "}
        <Link
          href={signUp ? "/login" : "/register"}
          className="font-medium text-[#533afd] hover:underline"
        >
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  )
}

export const AuthForm = EnterpriseAuthForm
export default EnterpriseAuthForm

