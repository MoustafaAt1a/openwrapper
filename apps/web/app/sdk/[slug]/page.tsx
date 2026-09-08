"use client"

import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useState } from "react"
import { GlobalFooterNavigation } from "@/components/global-footer-navigation"
import { GlobalHeaderNavigation } from "@/components/global-header-navigation"
import { CodeBlock } from "@/lib/code-syntax-highlighter"
import { SDK_DOCS, type SdkDoc } from "@/lib/sdk-registry"

const VALID_SLUGS = ["typescript", "php", "dotnet"] as const
type ValidSlug = (typeof VALID_SLUGS)[number]

function isValidSlug(slug: string): slug is ValidSlug {
  return (VALID_SLUGS as readonly string[]).includes(slug)
}

function SdkDetailContent({ doc }: { doc: SdkDoc }) {
  const [activeRecipe, setActiveRecipe] = useState(0)
  const lang = doc.shortName.toLowerCase() === "dotnet" ? "csharp" : doc.shortName.toLowerCase()
  const ext = lang === "typescript" ? "ts" : lang === "php" ? "php" : "cs"

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GlobalHeaderNavigation />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Link href="/sdk" className="hover:text-primary transition-colors">
            SDKs
          </Link>
          <span>/</span>
          <span className="text-foreground">{doc.shortName}</span>
        </nav>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full bg-primary/10 text-primary px-3 py-1 font-mono text-[11px] font-medium border border-primary/20">
              v{doc.version}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">{doc.ecosystem}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-3">
            {doc.name}
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-2xl">
            {doc.description}
          </p>
        </header>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-4">Installation</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 stripe-card-shadow-xs">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
                  <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
                </div>
                <span className="font-mono text-xs text-muted-foreground select-none pl-1">$</span>
                <code className="font-mono text-xs text-foreground truncate flex-1">
                  {doc.installCommand}
                </code>
              </div>
            </div>
            {doc.installAlternatives.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {doc.installAlternatives.map((alt) => (
                  <div
                    key={alt.label}
                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 border border-border text-[11px] font-mono"
                  >
                    <span className="text-muted-foreground">{alt.label}:</span>
                    <code className="text-foreground">{alt.command}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-4">Requirements</h2>
          <ul className="flex flex-col gap-2">
            {doc.requirements.map((req) => (
              <li key={req} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-4">Features</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {doc.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-2.5 rounded-xl bg-card border border-border p-3.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-foreground leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-2">{doc.quickstart.title}</h2>
          <p className="text-xs text-muted-foreground font-light mb-4">
            {doc.quickstart.description}
          </p>
          <CodeBlock
            code={doc.quickstart.code}
            id="quickstart"
            title={doc.quickstart.title}
            filename={`quickstart.${ext}`}
            language={lang}
            showLineNumbers={true}
          />
        </section>

        {/* Recipes */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-4">Payment recipes</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {doc.recipes.map((recipe, idx) => (
              <button
                key={recipe.title}
                type="button"
                onClick={() => setActiveRecipe(idx)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                  idx === activeRecipe
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/30"
                }`}
              >
                {recipe.title.length > 40 ? `${recipe.title.slice(0, 40)}…` : recipe.title}
              </button>
            ))}
          </div>
          {doc.recipes[activeRecipe] && (
            <div>
              <p className="text-xs text-muted-foreground font-light mb-3">
                {doc.recipes[activeRecipe].description}
              </p>
              <CodeBlock
                code={doc.recipes[activeRecipe].code}
                id={`recipe-${activeRecipe}`}
                title={doc.recipes[activeRecipe].title}
                filename={`${doc.recipes[activeRecipe].provider}.${ext}`}
                language={lang}
                showLineNumbers={true}
              />
            </div>
          )}
        </section>

        {/* Status Check */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-2">{doc.statusCheck.title}</h2>
          <p className="text-xs text-muted-foreground font-light mb-4">
            {doc.statusCheck.description}
          </p>
          <CodeBlock
            code={doc.statusCheck.code}
            id="status-check"
            title="status_check"
            filename={`status_check.${ext}`}
            language={lang}
            showLineNumbers={true}
          />
        </section>

        {/* Webhook Verification */}
        {doc.webhooks && (
          <section className="mb-10">
            <h2 className="text-lg font-medium text-foreground mb-2">{doc.webhooks.title}</h2>
            <p className="text-xs text-muted-foreground font-light mb-4">
              {doc.webhooks.description}
            </p>
            <CodeBlock
              code={doc.webhooks.code}
              id="webhooks-verify"
              title="webhook_verify"
              filename={`webhooks.${ext}`}
              language={lang}
              showLineNumbers={true}
            />
          </section>
        )}

        {/* Best Practices */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-foreground mb-4">Best practices</h2>
          <div className="flex flex-col gap-3">
            {doc.bestPractices.map((bp) => (
              <div key={bp.title} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-medium text-foreground mb-1">{bp.title}</h3>
                <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
                  {bp.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-3 pt-6 border-t border-border">
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-deep text-primary-foreground px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Try live checkout demo
          </Link>
          <Link
            href="/dashboard/documentation"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted text-foreground px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Full API reference
          </Link>
        </div>
      </div>

      <GlobalFooterNavigation />
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
