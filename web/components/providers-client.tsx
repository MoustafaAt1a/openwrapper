"use client"

import { useState } from "react"
import { Check, Copy, ExternalLink, KeyRound, Lock, Shield, Sliders, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export interface ProviderItem {
  id: string
  name: string
  region: string
  methods: string
  webhookPath: string
  security: string
  headers: string[]
  docsUrl: string
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
        "X-Paymob-Secret-Key: sec_live_...",
        "X-Paymob-Public-Key: pub_live_...",
        "X-Paymob-Hmac-Secret: ...",
        "X-Paymob-Integration-Id: 123456",
      ],
      docsUrl: "https://accept.paymob.com/docs",
    },
    {
      id: "fawry",
      name: "Fawry",
      region: "Egypt",
      methods: "Pay-at-Reference, Retail Kiosks & Mobile Outlets",
      webhookPath: "/api/v1/webhooks/fawry",
      security: "SHA-256 Message Signature",
      headers: [
        "X-Fawry-Merchant-Code: your_merchant_code",
        "X-Fawry-Secure-Key: your_secure_key",
        "X-Fawry-Base-Url: https://atfawry.fawrystaging.com (optional)",
      ],
      docsUrl: "https://developer.fawry.com",
    },
    {
      id: "stripe",
      name: "Stripe",
      region: "Global",
      methods: "Hosted Checkout Sessions, Apple Pay, Google Pay, Cards",
      webhookPath: "/api/v1/webhooks/stripe",
      security: "Stripe-Signature Timestamped Hash",
      headers: [
        "X-Stripe-Secret-Key: sk_live_...",
      ],
      docsUrl: "https://stripe.com/docs",
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
                  <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                    Active (Stateless)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {/* Webhook Destination URL */}
                <div className="flex flex-col gap-1.5 rounded-lg border border-border/80 bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Webhook Destination
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(fullWebhookUrl, rail.webhookPath)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy Webhook URL"
                    >
                      {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                  <code className="font-mono text-[11px] break-all select-all text-foreground/90 bg-black/20 p-1.5 rounded border border-border/50">
                    {fullWebhookUrl}
                  </code>
                </div>

                {/* Required Headers Box */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <KeyRound className="size-3" /> Merchant Request Headers
                  </span>
                  <div className="rounded-lg bg-black/30 border border-border/60 p-2.5 flex flex-col gap-1 font-mono text-[10px] text-muted-foreground">
                    {rail.headers.map((h, i) => (
                      <span key={i} className="text-emerald-400/90 truncate">{h}</span>
                    ))}
                  </div>
                </div>

                {/* Card Footer Features */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/80 pt-3 mt-auto">
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Shield className="size-3 text-primary" /> {rail.security}
                  </span>
                  <a
                    href={rail.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground text-primary text-[11px] font-mono"
                  >
                    Portal ↗
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
              Point your merchant dashboards to the destination URLs above. OpenWrapper automatically validates cryptographic signatures (<code className="font-mono text-[11px] text-foreground">HMAC-SHA512</code>, <code className="font-mono text-[11px] text-foreground">SHA-256</code>, or <code className="font-mono text-[11px] text-foreground">Stripe-Signature</code>) and updates the transaction state from <span className="font-mono text-amber-400 font-semibold">pending</span> to <span className="font-mono text-emerald-400 font-semibold">succeeded</span> or <span className="font-mono text-destructive font-semibold">failed</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
