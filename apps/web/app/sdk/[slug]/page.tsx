"use client"

import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useState } from "react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SDK_DOCS, type SdkDoc } from "@/lib/sdk-data"

const VALID_SLUGS = ["typescript", "php", "dotnet"] as const
type ValidSlug = (typeof VALID_SLUGS)[number]

function isValidSlug(slug: string): slug is ValidSlug {
  return (VALID_SLUGS as readonly string[]).includes(slug)
}

function CodeBlock({ code, id }: { code: string; id: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div
      id={id}
      className="relative rounded-xl bg-[#0d253d] dark:bg-[#080b14] border border-[#1e2646] overflow-hidden stripe-card-shadow-xs"
    >
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="absolute top-3 right-3 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-[#8ca3ba] hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="p-4 sm:p-5 overflow-x-auto text-[11px] sm:text-xs leading-relaxed font-mono text-[#c2d1e0] no-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function SdkDetailContent({ doc }: { doc: SdkDoc }) {
  const [activeRecipe, setActiveRecipe] = useState(0)

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-mono text-[#8ca3ba] dark:text-[#64748d]">
          <Link href="/sdk" className="hover:text-[#533afd] transition-colors">
            SDKs
          </Link>
          <span>/</span>
          <span className="text-[#0d253d] dark:text-white">{doc.shortName}</span>
        </nav>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full bg-[#533afd]/10 text-[#533afd] px-3 py-1 font-mono text-[11px] font-medium border border-[#533afd]/20">
              v{doc.version}
            </span>
            <span className="text-[11px] font-mono text-[#8ca3ba]">{doc.ecosystem}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-[#0d253d] dark:text-white mb-3">
            {doc.name}
          </h1>
          <p className="text-sm text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed max-w-2xl">
            {doc.description}
          </p>
        </header>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-4">Installation</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#0d253d] dark:bg-[#080b14] px-4 py-3 border border-[#1e2646]">
              <span className="font-mono text-xs text-[#8ca3ba] select-none">$</span>
              <code className="font-mono text-sm text-white flex-1">{doc.installCommand}</code>
            </div>
            {doc.installAlternatives.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {doc.installAlternatives.map((alt) => (
                  <div
                    key={alt.label}
                    className="flex items-center gap-2 rounded-lg bg-[#f6f9fc] dark:bg-[#141b33] px-3 py-2 border border-[#e3e8ee] dark:border-white/10 text-[11px] font-mono"
                  >
                    <span className="text-[#8ca3ba]">{alt.label}:</span>
                    <code className="text-[#0d253d] dark:text-white">{alt.command}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-4">Requirements</h2>
          <ul className="flex flex-col gap-2">
            {doc.requirements.map((req) => (
              <li
                key={req}
                className="flex items-start gap-2 text-xs text-[#64748d] dark:text-[#8ca3ba]"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  className="text-emerald-500 shrink-0 mt-0.5"
                />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-4">Features</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {doc.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-2.5 rounded-xl bg-[#f6f9fc] dark:bg-[#141b33] border border-[#e3e8ee] dark:border-white/10 p-3.5"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  className="text-[#533afd] shrink-0 mt-0.5"
                />
                <span className="text-xs text-[#273951] dark:text-[#c2d1e0] leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-2">
            {doc.quickstart.title}
          </h2>
          <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mb-4">
            {doc.quickstart.description}
          </p>
          <CodeBlock code={doc.quickstart.code} id="quickstart" />
        </section>

        {/* Recipes */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-4">
            Payment recipes
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {doc.recipes.map((recipe, idx) => (
              <button
                key={recipe.title}
                type="button"
                onClick={() => setActiveRecipe(idx)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                  idx === activeRecipe
                    ? "bg-[#533afd] text-white"
                    : "bg-[#f6f9fc] dark:bg-[#141b33] text-[#64748d] dark:text-[#8ca3ba] border border-[#e3e8ee] dark:border-white/10 hover:border-[#533afd]/30"
                }`}
              >
                {recipe.title.length > 40 ? `${recipe.title.slice(0, 40)}…` : recipe.title}
              </button>
            ))}
          </div>
          {doc.recipes[activeRecipe] && (
            <div>
              <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mb-3">
                {doc.recipes[activeRecipe].description}
              </p>
              <CodeBlock code={doc.recipes[activeRecipe].code} id={`recipe-${activeRecipe}`} />
            </div>
          )}
        </section>

        {/* Status Check */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-2">
            {doc.statusCheck.title}
          </h2>
          <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mb-4">
            {doc.statusCheck.description}
          </p>
          <CodeBlock code={doc.statusCheck.code} id="status-check" />
        </section>

        {/* Best Practices */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-4">
            Best practices
          </h2>
          <div className="flex flex-col gap-3">
            {doc.bestPractices.map((bp) => (
              <div
                key={bp.title}
                className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-4"
              >
                <h3 className="text-xs font-medium text-[#0d253d] dark:text-white mb-1">
                  {bp.title}
                </h3>
                <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
                  {bp.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-3 pt-6 border-t border-[#e3e8ee] dark:border-white/10">
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 rounded-full bg-[#533afd] hover:bg-[#4434d4] text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Try live checkout demo
          </Link>
          <Link
            href="/dashboard/documentation"
            className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] dark:border-white/15 bg-white/80 dark:bg-white/5 hover:bg-[#f6f9fc] dark:hover:bg-white/10 text-[#0d253d] dark:text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Full API reference
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}

export default function SdkDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  if (!isValidSlug(slug)) {
    notFound()
  }

  const doc = SDK_DOCS[slug]
  return <SdkDetailContent doc={doc} />
}
