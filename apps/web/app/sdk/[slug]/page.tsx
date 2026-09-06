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

function CodeBlock({ code, id, title }: { code: string; id: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const lines = code.split("\n")

  return (
    <div
      id={id}
      className="relative rounded-xl border border-[#d2d2d7] dark:border-[#2d3139] bg-white dark:bg-[#141418] shadow-xs overflow-hidden"
    >
      {/* Mac Window Header */}
      <div className="flex items-center justify-between border-b border-[#e5e5e7] dark:border-[#2b2b32] bg-[#f6f6f6] dark:bg-[#1e1e24] px-3.5 py-2 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
            <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
          </div>
          {title && (
            <span className="text-xs font-mono text-[#6e6e73] dark:text-[#8b949e] ml-2 pl-2 border-l border-[#e5e5e7] dark:border-[#2b2b32]">
              {title}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-1 rounded-md border border-[#d2d2d7] dark:border-[#3a3a46] bg-white dark:bg-[#2c2d38] px-2.5 py-0.5 font-mono text-[10px] text-[#1d1d1f] dark:text-[#e6edf3] hover:bg-[#f6f6f6] dark:hover:bg-[#363746] transition-colors cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="overflow-x-auto p-4 font-mono text-[11.5px] leading-relaxed text-[#24292f] dark:text-[#c9d1d9] bg-[#ffffff] dark:bg-[#0f111a]">
        <pre className="table w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={idx}
                className="hover:bg-[#f6f8fa] dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="w-8 pr-3 text-right text-[#8c959f] dark:text-[#6e7681] select-none text-[11px] align-top font-light font-tnum border-r border-[#eaecf0] dark:border-[#21262d]">
                  {idx + 1}
                </td>
                <td className="pl-3 whitespace-pre font-mono align-top overflow-visible">
                  <code>{line || " "}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </pre>
      </div>
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
            <div className="flex items-center justify-between rounded-xl border border-[#d2d2d7] dark:border-[#2d3139] bg-white dark:bg-[#141418] px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
                  <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
                </div>
                <span className="font-mono text-xs text-[#6e7781] dark:text-[#8b949e] select-none pl-1">
                  $
                </span>
                <code className="font-mono text-xs text-[#0f172a] dark:text-[#e6edf3] truncate flex-1">
                  {doc.installCommand}
                </code>
              </div>
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
          <CodeBlock code={doc.quickstart.code} id="quickstart" title="quickstart" />
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
              <CodeBlock
                code={doc.recipes[activeRecipe].code}
                id={`recipe-${activeRecipe}`}
                title={doc.recipes[activeRecipe].title}
              />
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
          <CodeBlock code={doc.statusCheck.code} id="status-check" title="status_check" />
        </section>

        {/* Webhook Verification */}
        {doc.webhooks && (
          <section className="mb-10">
            <h2 className="text-lg font-medium text-[#0d253d] dark:text-white mb-2">
              {doc.webhooks.title}
            </h2>
            <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light mb-4">
              {doc.webhooks.description}
            </p>
            <CodeBlock code={doc.webhooks.code} id="webhooks-verify" title="webhook_verify" />
          </section>
        )}

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
