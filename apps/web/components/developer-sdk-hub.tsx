"use client"

import { ArrowLeft, ArrowRight, Check, Code2, Copy, ShieldCheck, Terminal } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { AmbientGeometricShape, type ShapeColor } from "@/components/ambient-geometric-shape"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CodeBlock } from "@/lib/code-syntax-highlighter"
import { SDK_DOCS } from "@/lib/sdk-registry"

const SDK_VISUALS: Record<"typescript" | "php" | "dotnet", { shape: number; color: ShapeColor }> = {
  typescript: { shape: 12, color: "blue" },
  php: { shape: 34, color: "violet" },
  dotnet: { shape: 56, color: "emerald" },
}

export function DeveloperSdkHub({
  initialSdk = "typescript",
  isStandalonePage = false,
}: {
  initialSdk?: "typescript" | "php" | "dotnet"
  isStandalonePage?: boolean
}) {
  const [selectedSdk, setSelectedSdk] = useState<"typescript" | "php" | "dotnet">(initialSdk)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeRecipeIdx, setActiveRecipeIdx] = useState<number>(0)

  const doc = SDK_DOCS[selectedSdk]

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="flex flex-col gap-6" id="sdk-guides">
      {/* Standalone Header Bar if on dedicated SDK page */}
      {isStandalonePage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <Link
            href="/dashboard/documentation"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to API Explorer & Documentation
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">Version:</span>
            <Badge
              variant="outline"
              className="font-mono text-[11px] bg-primary/5 text-primary border-primary/20"
            >
              v{doc.version} LTS
            </Badge>
          </div>
        </div>
      )}

      {/* SDK Switcher Buttons / Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Client SDK Documentation & Integration Guides
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
            Select your stack
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(["typescript", "php", "dotnet"] as const).map((sdkKey) => {
            const item = SDK_DOCS[sdkKey]
            const visual = SDK_VISUALS[sdkKey]
            const isSelected = selectedSdk === sdkKey
            return (
              <motion.button
                key={sdkKey}
                type="button"
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedSdk(sdkKey)
                  setActiveRecipeIdx(0)
                }}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                    : "border-border/80 bg-card hover:bg-muted/40 hover:border-border text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AmbientGeometricShape shape={visual.shape} color={visual.color} size={15} />
                  <span
                    className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground mt-1 truncate">
                  {item.package}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Active SDK Card Container */}
      <Card className="relative rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md stripe-card-shadow-sm overflow-hidden">
        {/* Subtle geometric shape watermark */}
        <div className="pointer-events-none absolute -top-4 -right-4 select-none opacity-[0.06] dark:opacity-[0.11] transition-opacity duration-300">
          <AmbientGeometricShape
            shape={SDK_VISUALS[selectedSdk].shape}
            color={SDK_VISUALS[selectedSdk].color}
            size={110}
          />
        </div>

        {/* Header Summary */}
        <CardHeader className="border-b border-border/80 bg-muted/20 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <AmbientGeometricShape
                  shape={SDK_VISUALS[selectedSdk].shape}
                  color={SDK_VISUALS[selectedSdk].color}
                  size={18}
                />
                <CardTitle className="text-xl font-bold text-foreground">{doc.name}</CardTitle>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shrink-0"
                >
                  {doc.badgeText}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm max-w-3xl leading-relaxed font-light">
                {doc.description}
              </CardDescription>
            </div>

            {!isStandalonePage && (
              <Button
                asChild
                variant="outline"
                size="sm"
                pill
                className="font-mono text-xs shrink-0 self-start md:self-auto stripe-card-shadow-xs"
              >
                <Link href={`/dashboard/documentation/sdk/${doc.id}`}>
                  Dedicated Page <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </div>

          {/* Quick Install Banner */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-background p-2.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <Terminal className="size-4 text-muted-foreground shrink-0" />
              <code className="font-mono text-xs font-semibold text-foreground truncate select-all">
                {doc.installCommand}
              </code>
            </div>
            <button
              type="button"
              onClick={() => copyText(doc.installCommand, "install-main")}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors shrink-0 cursor-pointer self-end sm:self-auto"
            >
              {copiedKey === "install-main" ? (
                <>
                  <Check className="size-3 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copy
                </>
              )}
            </button>
          </div>

          {/* Alternative package managers */}
          {doc.installAlternatives.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Alternatives:
              </span>
              {doc.installAlternatives.map((alt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => copyText(alt.command, `alt-${idx}`)}
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer max-w-full truncate"
                  title={`Copy: ${alt.command}`}
                >
                  <span>{alt.label}:</span>
                  <span className="text-foreground truncate">{alt.command}</span>
                  {copiedKey === `alt-${idx}` ? (
                    <Check className="size-2.5 text-emerald-500 ml-1 shrink-0" />
                  ) : (
                    <Copy className="size-2.5 ml-1 opacity-60 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-8 pt-6">
          {/* Step 1: Client Setup & Quickstart */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold font-mono text-primary">
                  1
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {doc.quickstart.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyText(doc.quickstart.code, "quickstart-code")}
                className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-muted"
              >
                {copiedKey === "quickstart-code" ? (
                  <>
                    <Check className="size-3 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" /> Copy Snippet
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {doc.quickstart.description}
            </p>
            <div className="mt-1">
              <CodeBlock
                code={doc.quickstart.code}
                language={selectedSdk === "dotnet" ? "csharp" : selectedSdk}
                filename={
                  selectedSdk === "typescript"
                    ? "quickstart.ts"
                    : selectedSdk === "php"
                      ? "quickstart.php"
                      : "Program.cs"
                }
                showLineNumbers={true}
              />
            </div>
          </div>

          {/* Step 2: Payment Recipes (Card, Mobile Wallet, Fawry Kiosk, Stripe) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold font-mono text-primary">
                  2
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Payment Creation Recipes
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a payment method recipe to view verified, ready-to-run code:
            </p>

            {/* Recipe Sub-tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              {doc.recipes.map((recipe, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveRecipeIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium border transition-colors cursor-pointer ${
                    activeRecipeIdx === idx
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {recipe.provider === "paymob"
                    ? idx === 0
                      ? "Paymob 3DS Card"
                      : "Mobile Wallet"
                    : recipe.provider === "fawry"
                      ? "Fawry Kiosk"
                      : "Stripe Checkout"}
                </button>
              ))}
            </div>

            {/* Active Recipe Details */}
            {doc.recipes[activeRecipeIdx] && (
              <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      {doc.recipes[activeRecipeIdx].title}
                    </span>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase px-1.5">
                      {doc.recipes[activeRecipeIdx].provider}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {doc.recipes[activeRecipeIdx].description}
                </p>
                <div className="mt-1">
                  <CodeBlock
                    code={doc.recipes[activeRecipeIdx].code}
                    language={selectedSdk === "dotnet" ? "csharp" : selectedSdk}
                    filename={`${doc.recipes[activeRecipeIdx].provider}.${
                      selectedSdk === "typescript" ? "ts" : selectedSdk === "php" ? "php" : "cs"
                    }`}
                    title={doc.recipes[activeRecipeIdx].title}
                    showLineNumbers={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Status Check & Polling */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold font-mono text-primary">
                  3
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {doc.statusCheck.title}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{doc.statusCheck.description}</p>
            <div className="mt-1">
              <CodeBlock
                code={doc.statusCheck.code}
                language={selectedSdk === "dotnet" ? "csharp" : selectedSdk}
                filename={`status_check.${
                  selectedSdk === "typescript" ? "ts" : selectedSdk === "php" ? "php" : "cs"
                }`}
                showLineNumbers={true}
              />
            </div>
          </div>

          {/* Step 4: Webhook Handling */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold font-mono text-primary">
                  4
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {doc.webhooks.title}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{doc.webhooks.description}</p>
            <div className="mt-1">
              <CodeBlock
                code={doc.webhooks.code}
                language={selectedSdk === "dotnet" ? "csharp" : selectedSdk}
                filename={`webhooks.${
                  selectedSdk === "typescript" ? "ts" : selectedSdk === "php" ? "php" : "cs"
                }`}
                showLineNumbers={true}
              />
            </div>
          </div>

          {/* Golden Rules & Invariants */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider font-mono">
              <ShieldCheck className="size-4 text-emerald-500" /> Key Architectural Rules & Best
              Practices
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {doc.bestPractices.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/80 p-3"
                >
                  <span className="font-semibold text-xs text-foreground">{rule.title}</span>
                  <span className="text-[11px] text-muted-foreground leading-snug">
                    {rule.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const SdkGuideClient = DeveloperSdkHub
export default DeveloperSdkHub
