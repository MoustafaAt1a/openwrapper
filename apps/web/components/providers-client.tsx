"use client"

import { Check, Copy, KeyRound, Lock, Zap } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { GeometricShape, type ShapeColor } from "@/components/geometric-shape"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PROVIDER_VISUALS: Record<string, { shape: number; color: ShapeColor }> = {
  paymob: { shape: 16, color: "blue" },
  fawry: { shape: 29, color: "orange" },
  stripe: { shape: 44, color: "violet" },
  mock: { shape: 62, color: "emerald" },
}

export interface HeaderPair {
  key: string
  value: string
}

export interface ProviderItem {
  id: string
  name: string
  region: string
  methods: string
  gatewayPath: string
  webhookPath: string
  security: string
  headers: HeaderPair[]
  portalUrl: string
  portalLabel: string
}

export function ProvidersClient({
  origin,
  gatewayOrigin = "https://gateway.openwrapper.muejam.com",
}: {
  origin: string
  gatewayOrigin?: string
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const resolvedGatewayOrigin = (() => {
    const trimmed = (gatewayOrigin || "").trim().replace(/\/+$/, "")
    if (
      trimmed &&
      !trimmed.includes(".internal") &&
      !trimmed.includes("localhost") &&
      !trimmed.includes("127.0.0.1") &&
      !trimmed.includes(":8080")
    ) {
      return trimmed
    }
    return "https://gateway.openwrapper.muejam.com"
  })()

  const [activeOrigin, setActiveOrigin] = useState<string>(() => {
    const trimmed = (origin || "").trim().replace(/\/+$/, "")
    if (
      trimmed &&
      !trimmed.includes(".internal") &&
      !trimmed.includes("localhost") &&
      !trimmed.includes("127.0.0.1") &&
      !trimmed.includes(":8080")
    ) {
      return trimmed
    }
    return "https://openwrapper.muejam.com"
  })

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      const winOrigin = window.location.origin.trim().replace(/\/+$/, "")
      if (
        winOrigin &&
        !winOrigin.includes(".internal") &&
        !winOrigin.includes("localhost") &&
        !winOrigin.includes("127.0.0.1")
      ) {
        setActiveOrigin(winOrigin)
      }
    }
  }, [])

  const providers: ProviderItem[] = [
    {
      id: "paymob",
      name: "Paymob",
      region: "Egypt & MENA",
      methods: "Visa, Mastercard, Meeza, Mobile Wallets (Vodafone/InstaPay)",
      gatewayPath: "/v1/webhooks/paymob",
      webhookPath: "/api/v1/webhooks/paymob",
      security: "HMAC-SHA512",
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
      gatewayPath: "/v1/webhooks/fawry",
      webhookPath: "/api/v1/webhooks/fawry",
      security: "SHA-256 Sig",
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
      gatewayPath: "/v1/webhooks/stripe",
      webhookPath: "/api/v1/webhooks/stripe",
      security: "Stripe-Signature (v1)",
      headers: [
        { key: "X-Stripe-Secret-Key", value: "sk_live_..." },
        { key: "X-Stripe-Webhook-Secret", value: "whsec_..." },
      ],
      portalUrl: "https://dashboard.stripe.com/login",
      portalLabel: "Stripe Dashboard ↗",
    },
  ]

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("Webhook URL copied to clipboard!")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Payment Infrastructure
          </p>
          <span className="text-muted-foreground/40">•</span>
          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Gateway: https://gateway.openwrapper.muejam.com
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Payment Providers & Routing Rails
        </h1>
        <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
          OpenWrapper operates on a <strong>zero-storage, stateless architecture</strong>. Merchants
          provide their own gateway API keys per-request via encrypted TLS headers or client SDK
          options. Webhooks route dynamically through either the high-performance Rust Gateway (
          <code className="text-foreground font-mono font-medium">
            https://gateway.openwrapper.muejam.com
          </code>
          ) or the Web Control Plane (
          <code className="text-foreground font-mono font-medium">
            https://openwrapper.muejam.com
          </code>
          ).
        </p>
      </div>

      {/* Provider Grid */}
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {providers.map((rail) => {
          const gatewayWebhookUrl = `${resolvedGatewayOrigin}${rail.gatewayPath}`
          const webWebhookUrl = `${activeOrigin}${rail.webhookPath}`
          const visual = PROVIDER_VISUALS[rail.id] || { shape: 1, color: "blue" }

          return (
            <motion.div
              key={rail.id}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="h-full"
            >
              <Card className="relative overflow-hidden flex flex-col justify-between border-border/80 bg-card shadow-2xs h-full transition-colors hover:border-border">
                {/* Subtle corner watermark */}
                <div className="pointer-events-none absolute -top-4 -right-4 select-none opacity-[0.06] dark:opacity-[0.11] transition-opacity duration-300">
                  <GeometricShape shape={visual.shape} color={visual.color} size={110} />
                </div>

                <CardHeader className="pb-4 min-h-[96px] flex flex-col justify-start">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
                        <GeometricShape shape={visual.shape} color={visual.color} size={17} />
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="truncate">{rail.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1 leading-snug">
                        {rail.region} • {rail.methods}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0 whitespace-nowrap"
                    >
                      Active (Stateless)
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  {/* Dual-Rail Webhook Destinations */}
                  <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/40 dark:bg-muted/20 p-2.5">
                    {/* Rust Gateway Rail */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground font-semibold">
                            Rust Gateway Rail
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(gatewayWebhookUrl, `gw-${rail.id}`)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded hover:bg-muted/60"
                          title="Copy Rust Gateway webhook URL"
                          aria-label={`Copy ${rail.name} Rust Gateway webhook URL`}
                        >
                          {copiedKey === `gw-${rail.id}` ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                      <code className="font-mono text-[10.5px] break-all select-all text-primary font-medium bg-background border border-border/70 px-2 py-1 rounded">
                        {gatewayWebhookUrl}
                      </code>
                    </div>

                    {/* Web Control Plane Rail */}
                    <div className="flex flex-col gap-1 pt-1.5 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-cyan-500 shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                            Web Control Plane
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(webWebhookUrl, `web-${rail.id}`)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded hover:bg-muted/60"
                          title="Copy Web Control Plane webhook URL"
                          aria-label={`Copy ${rail.name} Web Control Plane webhook URL`}
                        >
                          {copiedKey === `web-${rail.id}` ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                      <code className="font-mono text-[10.5px] break-all select-all text-muted-foreground font-medium bg-background border border-border/70 px-2 py-1 rounded">
                        {webWebhookUrl}
                      </code>
                    </div>
                  </div>

                  {/* Required Dynamic Headers */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="size-3.5 text-muted-foreground" />
                      Required Dynamic Headers (Per-Request)
                    </span>
                    <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                      {rail.headers.map((h) => {
                        const copyId = `hdr-${rail.id}-${h.key}`
                        return (
                          <div
                            key={h.key}
                            className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5"
                          >
                            <span className="text-foreground font-medium truncate">{h.key}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                {h.value}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(h.key, copyId)}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title={`Copy ${h.key}`}
                                aria-label={`Copy header name ${h.key}`}
                              >
                                {copiedKey === copyId ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Merchant Direct Portal Link */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Manage Credentials:</span>
                    <a
                      href={rail.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline shrink-0 whitespace-nowrap"
                    >
                      {rail.portalLabel}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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
              <span>
                Merchant secret keys live only in the merchant's application{" "}
                <code className="text-foreground">.env</code>.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">2.</span>
              <span>
                Headers are sent over encrypted TLS and never persisted to the OpenWrapper database.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">3.</span>
              <span>
                OpenWrapper only records non-sensitive transaction IDs, timestamps, and routing
                latencies.
              </span>
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
              Point your merchant dashboards to the destination URLs above. OpenWrapper
              automatically validates cryptographic signatures (
              <code className="font-mono text-[11px] text-foreground">HMAC-SHA512</code>,{" "}
              <code className="font-mono text-[11px] text-foreground">SHA-256</code>, or{" "}
              <code className="font-mono text-[11px] text-foreground">Stripe-Signature</code>) and
              updates the transaction state from{" "}
              <span className="font-mono text-amber-500 font-semibold">pending</span> to{" "}
              <span className="font-mono text-emerald-500 font-semibold">succeeded</span> or{" "}
              <span className="font-mono text-destructive font-semibold">failed</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
