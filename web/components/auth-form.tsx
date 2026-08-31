"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const signUp = mode === "sign-up"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email"))
    const password = String(form.get("password"))
    const result = signUp
      ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError("We could not complete that request. Check your details and try again.")
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        {signUp && <Field><FieldLabel htmlFor="name">Name</FieldLabel><Input id="name" name="name" autoComplete="name" required minLength={2} /></Field>}
        <Field><FieldLabel htmlFor="email">Work email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" name="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} required minLength={8} /></Field>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
        {signUp ? "Create account" : "Sign in"}
        {!pending && <ArrowRight data-icon="inline-end" />}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signUp ? "Already have an account?" : "New to OpenWrapper?"}{" "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="font-medium text-foreground underline underline-offset-4">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  )
}
