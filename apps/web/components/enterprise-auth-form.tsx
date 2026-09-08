import { ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function EnterpriseAuthForm({
  mode,
  onModeChange,
}: {
  mode: "login" | "register"
  onModeChange?: (mode: "login" | "register") => void
}) {
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
      <FieldGroup className="gap-3.5">
        <AnimatePresence initial={false}>
          {signUp && (
            <motion.div
              key="fullname-field"
              initial={{ opacity: 0, height: 0, marginTop: -4 }}
              animate={{ opacity: 1, height: "auto", marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <Field>
                <FieldLabel htmlFor="name" className="text-xs font-medium text-foreground">
                  Full name
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required={signUp}
                  minLength={2}
                  placeholder="e.g. Alex Morgan"
                  className="rounded-xl border-border bg-card h-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

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
            placeholder="name@company.com"
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
            placeholder="••••••••••••"
            className="rounded-xl border-border bg-card h-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>
      </FieldGroup>

      {error && <FieldError>{error}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-full font-medium text-sm bg-primary hover:bg-primary-deep active:bg-primary-press text-primary-foreground stripe-card-shadow-sm hover:stripe-card-shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-1 overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {pending ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="size-4 animate-spin" />
              <span>Processing...</span>
            </motion.span>
          ) : (
            <motion.span
              key={signUp ? "signup" : "signin"}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-1.5"
            >
              <span>{signUp ? "Create workspace" : "Sign in"}</span>
              <ArrowRight className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {signUp ? "Already have an account?" : "New to OpenWrapper?"}{" "}
        <button
          type="button"
          onClick={() => onModeChange?.(signUp ? "login" : "register")}
          className="font-medium text-primary hover:underline cursor-pointer transition-colors"
        >
          {signUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  )
}

export const AuthForm = EnterpriseAuthForm
export default EnterpriseAuthForm
