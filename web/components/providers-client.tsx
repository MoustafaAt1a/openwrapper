"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, KeyRound, Lock, Shield, Sliders, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export interface HeaderPair {
  key: string
  value: string
}

export interface ProviderItem {
  id: string
  name: string
  region: string
  methods: string
  webhookPath: string
  security: string
  headers: HeaderPair[]
  portalUrl: string
  portalLabel: string
}

export function ProvidersClient({ origin }: { origin: string }) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const providers: ProviderItem[] = [
    {
      id: "paymob",
      name: "Paymob",
      region: "Egypt & MENA",
      methods: "Visa, Mastercard, Meeza, Mobile Wallets (Vodafone/InstaPay)",
      webhookPath: "/api/v1/webhooks/paymob",
      security: "HMAC-SHA512 Verification",
      headers: [
        { key: "X-Paymob-Secret-Key", value: "sec_live_..." },
        { key: "X-Paymob-Public-Key", value: "pub_live_..." },
        { key: "X-Paymob-Hmac-Secret", value: "your_hmac_secret" },
        { key: "X-Paymob-Integration-Id", value: "123456" },
      ],
      portalUrl: "https://accept.paymob.com/portal2/en/login",
      portalLabel: "Paymob Portal ↗",
    },
    {
      id: "fawry",
      name: "Fawry",
      region: "Egypt",
      methods: "Pay-at-Reference, Retail Kiosks & Outlets",
      webhookPath: "/api/v1/webhooks/fawry",
      security: "SHA-256 Message Signature",
      headers: [
        { key: "X-Fawry-Merchant-Code", value: "your_merchant_code" },
        { key: "X-Fawry-Secure-Key", value: "your_secure_key" },
        { key: "X-Fawry-Base-Url", value: "https://atfawry.fawrystaging.com" },
      ],
      portalUrl: "https://www.atfawry.com",
      portalLabel: "Fawry Portal ↗",
    },
    {
      id: "stripe",
      name: "Stripe",
      region: "Global",
      methods: "Hosted Checkout, Apple Pay, Google Pay, Cards",
      webhookPath: "/api/v1/webhooks/stripe",
      security: "Stripe-Signature Timestamped Hash",
      headers: [
        { key: "X-Stripe-Secret-Key", value: "sk_live_..." },
      ],
      portalUrl: "https://dashboard.stripe.com/login",
      portalLabel: "Stripe Dashboard ↗",
    },
  ]

  function copyToClipboard(text: string, path: string) {
    navigator.clipboard.writeText(text)
    setCopiedPath(path)
    toast.success("Webhook URL copied to clipboard!")
    setTimeout(() => setCopiedPath(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Payment Infrastructure
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Payment Providers & Routing Rails
        </h1>
        <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
          OpenWrapper operates on a <strong>zero-storage, stateless architecture</strong>. Merchants provide their own gateway API keys per-request via encrypted TLS headers or client SDK options.
        </p>
      </div>

      {/* Provider Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {providers.map((rail) => {
          const fullWebhookUrl = `${origin}${rail.webhookPath}`
          const isCopied = copiedPath === rail.webhookPath

          return (
            <Card key={rail.id} className="flex flex-col justify-between border-border/80 bg-card shadow-2xs">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      {rail.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {rail.region} • {rail.methods}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    Active (Stateless)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Webhook Destination URL */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/80 bg-muted/40 dark:bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Webhook Destination
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(fullWebhookUrl, rail.webhookPath)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded hover:bg-muted/60"
                      title="Copy webhook URL"
                      aria-label={`Copy ${rail.name} webhook URL`}
                    >
                      {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                  <code className="font-mono text-[11px] break-all select-all text-primary font-medium bg-background border border-border/70 p-2 rounded">
                    {fullWebhookUrl}
                  </code>
                </div>

                {/* Required Headers Box (High Contrast & Clear Colors) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <KeyRound className="size-3 text-muted-foreground" /> Merchant Request Headers
                  </span>
                  <div className="rounded-lg bg-muted/50 dark:bg-black/40 border border-border/80 p-3 flex flex-col gap-2 font-mono text-[11px]">
                    {rail.headers.map((h, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between gap-1 border-b border-border/40 last:border-b-0 pb-1.5 last:pb-0">
                        <span className="text-foreground font-semibold text-[11px]">{h.key}</span>
                        <span className="text-muted-foreground text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/60">{h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Features & Portal Link */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/80 pt-3 mt-auto">
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Shield className="size-3 text-emerald-500" /> {rail.security}
                  </span>
                  <a
                    href={rail.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                  >
                    {rail.portalLabel}
                  </a>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Security & Webhook Guidelines */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/80 bg-card shadow-2xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="size-4 text-emerald-500" /> Zero-Storage Security Guarantee
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              How OpenWrapper protects your payment credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground font-mono">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">1.</span>
              <span>Merchant secret keys live only in the merchant's application <code className="text-foreground">.env</code>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">2.</span>
              <span>Headers are sent over encrypted TLS and never persisted to the OpenWrapper database.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">3.</span>
              <span>OpenWrapper only records non-sensitive transaction IDs, timestamps, and routing latencies.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-2xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-amber-500" /> Automated Webhook Normalization
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Deterministic state machine transitions for all providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              Point your merchant dashboards to the destination URLs above. OpenWrapper automatically validates cryptographic signatures (<code className="font-mono text-[11px] text-foreground">HMAC-SHA512</code>, <code className="font-mono text-[11px] text-foreground">SHA-256</code>, or <code className="font-mono text-[11px] text-foreground">Stripe-Signature</code>) and updates the transaction state from <span className="font-mono text-amber-500 font-semibold">pending</span> to <span className="font-mono text-emerald-500 font-semibold">succeeded</span> or <span className="font-mono text-destructive font-semibold">failed</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
