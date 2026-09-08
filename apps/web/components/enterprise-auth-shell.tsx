"use client"

import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { EnterpriseAuthForm } from "@/components/enterprise-auth-form"
import { BrandLogoMark } from "@/components/brand-logo-mark"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { OPENWRAPPER_VERSION_TAG } from "@/lib/version"

export function EnterpriseAuthShell({ mode }: { mode: "login" | "register" }) {
  const signUp = mode === "register"
  return (
    <main className="relative isolate min-h-screen flex flex-col justify-between items-center p-4 sm:p-8 lg:p-12 bg-background text-foreground overflow-hidden">
      {/* Signature Atmospheric Mesh Glow */}
      <AtmosphericGradientMesh className="opacity-60" />
      {/* Ambient Swoosh Ribbon */}
      <StripeSwoosh className="opacity-40" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <BrandLogoMark />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-muted transition-all"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Centered Auth Card Container */}
      <div className="w-full max-w-md my-auto py-8 z-10">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-7 sm:p-9 stripe-card-shadow-lg flex flex-col gap-6">
          <div className="flex flex-col gap-2.5 text-center items-center">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs text-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {signUp ? "Developer Onboarding" : "Welcome Back"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
              {signUp ? "Create your workspace" : "Sign in to OpenWrapper"}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-xs text-balance font-light">
              {signUp
                ? "Generate production API keys and unify Paymob, Fawry, and Stripe."
                : "Manage your payment ledger, real-time telemetry, and API keys."}
            </p>
          </div>

          <EnterpriseAuthForm mode={mode} />

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4 text-[11px] font-mono text-muted-foreground text-center">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>SHA-256 Hashed</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Zero Double-Charge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border text-xs text-muted-foreground font-mono z-10 text-center sm:text-left">
        <span>OpenWrapper {OPENWRAPPER_VERSION_TAG} · Unified Payment Infrastructure</span>
        <span>Secure by default · Observable by design</span>
      </footer>
    </main>
  )
}

export const AuthPage = EnterpriseAuthShell
export default EnterpriseAuthShell
