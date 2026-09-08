"use client"

import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { AtmosphericGradientMesh } from "@/components/atmospheric-gradient-mesh"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { StripeSwoosh } from "@/components/ambient-flowing-ribbon"
import { SDK_DOCS } from "@/lib/sdk-registry"

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
      className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-primary hover:bg-muted transition-colors cursor-pointer"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function SdkHubPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GlobalHeaderNavigation />

      <section className="relative isolate overflow-hidden py-16 sm:py-24">
        <AtmosphericGradientMesh className="opacity-40 dark:opacity-20" />
        <StripeSwoosh className="opacity-30 dark:opacity-15" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <header className="mb-12 sm:mb-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-mono text-primary mb-4">
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>v0.2.0 LTS Client Libraries</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-normal tracking-[-0.035em] text-foreground mb-4">
              SDKs & Libraries
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed">
              Official client libraries for TypeScript, PHP, and .NET. Built for high-throughput
              zero-knowledge operation, automatic idempotency key hashing, discrete integer
              minor-unit arithmetic, and constant-time webhook verification.
            </p>
          </header>

          <div className="grid gap-6 sm:gap-8">
            {SDK_KEYS.map((key) => {
              const doc = SDK_DOCS[key]
              const meta = SDK_META[key]
              return (
                <Link key={key} href={`/sdk/${meta.slug}`} className="group block">
                  <div
                    className={`rounded-2xl border border-border bg-gradient-to-br ${meta.gradient} bg-card/80 backdrop-blur-sm p-6 sm:p-8 stripe-card-shadow-sm transition-depth hover:stripe-card-shadow-md`}
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
                            <h2 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                              {doc.name}
                            </h2>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {doc.ecosystem}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground font-light leading-relaxed mb-4 max-w-xl">
                          {doc.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {doc.features.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              {f.length > 50 ? `${f.slice(0, 50)}…` : f}
                            </span>
                          ))}
                        </div>

                        {/* Install command */}
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 max-w-md stripe-card-shadow-xs">
                          <div className="flex items-center gap-1 shrink-0 mr-1">
                            <span className="size-2 rounded-full bg-[#ff5f56]" />
                            <span className="size-2 rounded-full bg-[#ffbd2e]" />
                            <span className="size-2 rounded-full bg-[#27c93f]" />
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground select-none">
                            $
                          </span>
                          <code className="font-mono text-xs text-foreground truncate flex-1">
                            {doc.installCommand}
                          </code>
                          <CopyButton text={doc.installCommand} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary group-hover:gap-2.5 transition-all shrink-0 self-center">
                        <span>View docs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <GlobalFooterNavigation />
    </main>
  )
}
