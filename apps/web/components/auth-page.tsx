import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
import { Brand } from "@/components/brand"

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signUp = mode === "sign-up"
  return (
    <main className="relative isolate min-h-screen flex flex-col justify-between items-center p-4 sm:p-8 lg:p-12 bg-background text-foreground overflow-hidden">
      {/* Ambient Halftone Background Effect */}
      <div
        data-aifx="halftone"
        data-aifx-colors="#3a4ff8,#6973dc"
        className="absolute inset-0 -z-10 pointer-events-none opacity-20"
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Centered Auth Card Container */}
      <div className="w-full max-w-md my-auto py-8 z-10">
        <div className="rounded-2xl border border-border/80 bg-card p-7 sm:p-9 shadow-xl shadow-black/5 flex flex-col gap-6">
          <div className="flex flex-col gap-2.5 text-center items-center">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {signUp ? "Developer Onboarding" : "Welcome Back"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {signUp ? "Create your workspace" : "Sign in to OpenWrapper"}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-xs text-balance">
              {signUp
                ? "Generate production API keys and unify Paymob, Fawry, and Stripe."
                : "Manage your payment ledger, real-time telemetry, and API keys."}
            </p>
          </div>

          <AuthForm mode={mode} />

          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-4 text-[11px] font-mono text-muted-foreground text-center">
            <div className="flex items-center justify-center gap-1">
              <ShieldCheck className="size-3 text-emerald-500" />
              <span>SHA-256 Hashed</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Zero Double-Charge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border/60 text-xs text-muted-foreground font-mono z-10 text-center sm:text-left">
        <span>OpenWrapper v0.1.1 LTS · Unified Payment Infrastructure</span>
        <span>Secure by default · Observable by design</span>
      </footer>
    </main>
  )
}
