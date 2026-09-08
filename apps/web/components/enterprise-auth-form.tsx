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
            <FieldLabel htmlFor="name" className="text-xs font-medium text-foreground">
              Full name
            </FieldLabel>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              className="rounded-xl border-border bg-card h-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="email" className="text-xs font-medium text-foreground">
            Work email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-xl border-border bg-card h-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password" className="text-xs font-medium text-foreground">
            Password
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={signUp ? "new-password" : "current-password"}
            required
            minLength={8}
            className="rounded-xl border-border bg-card h-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>
      </FieldGroup>

      {error && <FieldError>{error}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-full font-medium text-sm bg-primary hover:bg-primary-deep active:bg-primary-press text-primary-foreground stripe-card-shadow-sm hover:stripe-card-shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-1"
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

      <p className="text-center text-xs text-muted-foreground">
        {signUp ? "Already have an account?" : "New to OpenWrapper?"}{" "}
        <Link
          href={signUp ? "/login" : "/register"}
          className="font-medium text-primary hover:underline"
        >
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  )
}

export const AuthForm = EnterpriseAuthForm
export default EnterpriseAuthForm
