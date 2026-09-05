"use client"

import { ArrowLeft01Icon, CheckmarkCircle01Icon, ShieldCheckIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
import { Brand } from "@/components/brand"
import { GradientMesh } from "@/components/gradient-mesh"
import { StripeSwoosh } from "@/components/swoosh"

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signUp = mode === "sign-up"
  return (
    <main className="relative isolate min-h-screen flex flex-col justify-between items-center p-4 sm:p-8 lg:p-12 bg-[#f6f9fc] dark:bg-[#080b14] text-[#0d253d] dark:text-[#f6f9fc] overflow-hidden">
      {/* Signature Atmospheric Mesh Glow */}
      <GradientMesh className="opacity-60" />
      {/* Ambient Swoosh Ribbon */}
      <StripeSwoosh className="opacity-40" />

      {/* Top Navigation Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-white/5 transition-all"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Centered Auth Card Container */}
      <div className="w-full max-w-md my-auto py-8 z-10">
        <div className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-xl p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,55,112,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col gap-6">
          <div className="flex flex-col gap-2.5 text-center items-center">
            <div className="flex items-center gap-2 rounded-full border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] px-3.5 py-1 text-xs text-[#273951] dark:text-[#c2d1e0]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
                {signUp ? "Developer Onboarding" : "Welcome Back"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0d253d] dark:text-white">
              {signUp ? "Create your workspace" : "Sign in to OpenWrapper"}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-[#64748d] dark:text-[#8ca3ba] max-w-xs text-balance font-light">
              {signUp
                ? "Generate production API keys and unify Paymob, Fawry, and Stripe."
                : "Manage your payment ledger, real-time telemetry, and API keys."}
            </p>
          </div>

          <AuthForm mode={mode} />

          <div className="grid grid-cols-2 gap-2 border-t border-[#e3e8ee] dark:border-white/10 pt-4 text-[11px] font-mono text-[#64748d] dark:text-[#8ca3ba] text-center">
            <div className="flex items-center justify-center gap-1.5">
              <HugeiconsIcon icon={ShieldCheckIcon} size={14} className="text-emerald-500" />
              <span>SHA-256 Hashed</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-500" />
              <span>Zero Double-Charge</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-[#e3e8ee]/60 dark:border-white/10 text-xs text-[#64748d] dark:text-[#8ca3ba] font-mono z-10 text-center sm:text-left">
        <span>OpenWrapper v0.1.3 LTS · Unified Payment Infrastructure</span>
        <span>Secure by default · Observable by design</span>
      </footer>
    </main>
  )
}
