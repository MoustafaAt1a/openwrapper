"use client"

import { ArrowRight01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useState } from "react"
import { GradientMesh } from "@/components/gradient-mesh"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { StripeSwoosh } from "@/components/swoosh"
import { SDK_DOCS } from "@/lib/sdk-data"

const SDK_KEYS = ["typescript", "php", "dotnet"] as const

const SDK_META: Record<
  (typeof SDK_KEYS)[number],
  { gradient: string; iconBg: string; slug: string }
> = {
  typescript: {
    gradient: "from-blue-500/10 to-cyan-500/5",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    slug: "typescript",
  },
  php: {
    gradient: "from-violet-500/10 to-purple-500/5",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    slug: "php",
  },
  dotnet: {
    gradient: "from-emerald-500/10 to-green-500/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    slug: "dotnet",
  },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="shrink-0 rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] px-3 py-1.5 font-mono text-[11px] text-[#533afd] hover:bg-[#f6f9fc] dark:hover:bg-white/5 transition-colors cursor-pointer"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function SdkHubPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative isolate overflow-hidden py-16 sm:py-24">
        <GradientMesh className="opacity-40 dark:opacity-20" />
        <StripeSwoosh className="opacity-30 dark:opacity-15" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <header className="mb-12 sm:mb-16 max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-[#0d253d] dark:text-white mb-4">
              SDKs & Libraries
            </h1>
            <p className="text-sm sm:text-base text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
              Official client libraries for TypeScript, PHP, and .NET. Each SDK provides type-safe
              payment creation, automatic idempotency, and stateless credential forwarding.
            </p>
          </header>

          <div className="grid gap-6 sm:gap-8">
            {SDK_KEYS.map((key) => {
              const doc = SDK_DOCS[key]
              const meta = SDK_META[key]
              return (
                <Link key={key} href={`/sdk/${meta.slug}`} className="group block">
                  <div
                    className={`rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-gradient-to-br ${meta.gradient} bg-white/80 dark:bg-[#0f1426]/80 backdrop-blur-sm p-6 sm:p-8 stripe-card-shadow-sm transition-depth hover:stripe-card-shadow-md`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`flex size-9 items-center justify-center rounded-lg border ${meta.iconBg}`}
                          >
                            <span className="font-mono text-xs font-bold">
                              {key === "typescript" ? "TS" : key === "php" ? "PHP" : ".N"}
                            </span>
                          </div>
                          <div>
                            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white group-hover:text-[#533afd] transition-colors">
                              {doc.name}
                            </h2>
                            <span className="text-[11px] font-mono text-[#8ca3ba] dark:text-[#64748d]">
                              {doc.ecosystem}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed mb-4 max-w-xl">
                          {doc.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {doc.features.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center gap-1 text-[10px] text-[#64748d] dark:text-[#8ca3ba]"
                            >
                              <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                size={12}
                                className="text-emerald-500 shrink-0"
                              />
                              {f.length > 50 ? `${f.slice(0, 50)}…` : f}
                            </span>
                          ))}
                        </div>

                        {/* Install command */}
                        <div className="flex items-center gap-2 rounded-xl bg-[#0d253d] dark:bg-[#080b14] px-4 py-2.5 max-w-md">
                          <span className="font-mono text-[11px] text-[#8ca3ba] select-none">
                            $
                          </span>
                          <code className="font-mono text-xs text-white truncate flex-1">
                            {doc.installCommand}
                          </code>
                          <CopyButton text={doc.installCommand} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#533afd] group-hover:gap-2.5 transition-all shrink-0 self-center">
                        <span>View docs</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
