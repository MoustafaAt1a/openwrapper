"use client"

import { Check, Copy, KeyRound, Lock, Zap } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PROVIDER_METRICS: Record<string, { accent: string; badgeColor: string }> = {
  paymob: {
    accent: "border-l-[#533afd]",
    badgeColor: "text-[#8c82fc] bg-[#533afd]/10 border-[#533afd]/20",
  },
  fawry: {
    accent: "border-l-amber-500",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  stripe: {
    accent: "border-l-[#00d4ff]",
    badgeColor: "text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/20",
  },
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
          <p className="font-mono text-xs uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
            Payment Infrastructure
          </p>
          <span className="text-[#64748d]/40 dark:text-white/20">•</span>
          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Gateway: https://gateway.openwrapper.muejam.com
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light tracking-[-0.03em] text-[#0d253d] dark:text-white">
          Payment Providers & Routing Rails
        </h1>
        <p className="max-w-3xl text-xs sm:text-sm text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
          OpenWrapper operates on a{" "}
          <strong className="font-medium text-[#0d253d] dark:text-white">
            zero-storage, stateless architecture
          </strong>
          . Merchants provide their own gateway API keys per-request via encrypted TLS headers or
          client SDK options. Webhooks route dynamically through either the high-performance Rust
          Gateway (
          <code className="text-[#0d253d] dark:text-white font-mono font-medium">
            https://gateway.openwrapper.muejam.com
          </code>
          ) or the Web Control Plane (
          <code className="text-[#0d253d] dark:text-white font-mono font-medium">
            https://openwrapper.muejam.com
          </code>
          ).
        </p>
      </div>

      {/* Provider Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {providers.map((rail) => {
          const gatewayWebhookUrl = `${resolvedGatewayOrigin}${rail.gatewayPath}`
          const webWebhookUrl = `${activeOrigin}${rail.webhookPath}`
          const meta = PROVIDER_METRICS[rail.id] || {
            accent: "border-l-[#533afd]",
            badgeColor: "text-[#8c82fc] bg-[#533afd]/10 border-[#533afd]/20",
          }

          return (
            <motion.div
              key={rail.id}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="h-full"
            >
              <Card
                className={`relative overflow-hidden flex flex-col justify-between rounded-2xl border border-l-2 ${meta.accent} border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs h-full transition-all hover:shadow-md hover:border-[#533afd]/40`}
              >
                <CardHeader className="pb-4 min-h-[96px] flex flex-col justify-start">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 font-medium text-[#0d253d] dark:text-white">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">{rail.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] mt-1 leading-snug font-light">
                        {rail.region} • {rail.methods}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${meta.badgeColor} shrink-0 whitespace-nowrap rounded-full`}
                    >
                      Active (Stateless)
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  {/* Dual-Rail Webhook Destinations */}
                  <div className="flex flex-col gap-2 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/80 dark:bg-[#141b33]/40 p-3">
                    {/* Rust Gateway Rail */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#0d253d] dark:text-white font-medium">
                            Rust Gateway Rail
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(gatewayWebhookUrl, `gw-${rail.id}`)}
                          className="text-[#64748d] hover:text-[#0d253d] dark:hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
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
                      <code className="font-mono text-[10.5px] break-all select-all text-[#533afd] font-medium bg-white dark:bg-[#0c1024] border border-[#e3e8ee] dark:border-white/10 px-2 py-1 rounded-md">
                        {gatewayWebhookUrl}
                      </code>
                    </div>

                    {/* Web Control Plane Rail */}
                    <div className="flex flex-col gap-1 pt-2 border-t border-[#e3e8ee]/60 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] font-medium">
                            Web Control Plane
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(webWebhookUrl, `web-${rail.id}`)}
                          className="text-[#64748d] hover:text-[#0d253d] dark:hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
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
                      <code className="font-mono text-[10.5px] break-all select-all text-[#64748d] dark:text-[#8ca3ba] font-medium bg-white dark:bg-[#0c1024] border border-[#e3e8ee] dark:border-white/10 px-2 py-1 rounded-md">
                        {webWebhookUrl}
                      </code>
                    </div>
                  </div>

                  {/* Required Dynamic Headers */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-[#0d253d] dark:text-white flex items-center gap-1.5 font-mono">
                      <KeyRound className="size-3.5 text-[#64748d] dark:text-[#8ca3ba]" />
                      Required Dynamic Headers (Per-Request)
                    </span>
                    <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                      {rail.headers.map((h) => {
                        const copyId = `hdr-${rail.id}-${h.key}`
                        return (
                          <div
                            key={h.key}
                            className="flex items-center justify-between rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/20 px-2.5 py-1.5 gap-1.5"
                          >
                            <span className="text-[#0d253d] dark:text-white font-medium truncate min-w-0 flex-1">
                              {h.key}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[#64748d] dark:text-[#8ca3ba] truncate max-w-[90px] sm:max-w-[120px]">
                                {h.value}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(h.key, copyId)}
                                className="text-[#64748d] hover:text-[#0d253d] dark:hover:text-white transition-colors cursor-pointer"
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
                  <div className="pt-2 border-t border-[#e3e8ee] dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] font-mono">
                      Manage Credentials:
                    </span>
                    <a
                      href={rail.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-[#533afd] dark:text-[#8c82fc] hover:underline shrink-0 whitespace-nowrap"
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
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-medium text-[#0d253d] dark:text-white">
              <Lock className="size-4 text-emerald-500" /> Zero-Storage Security Guarantee
            </CardTitle>
            <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light">
              How OpenWrapper protects your payment credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-2.5 text-xs text-[#64748d] dark:text-[#8ca3ba] font-mono">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">1.</span>
              <span>
                Merchant secret keys live only in the merchant's application{" "}
                <code className="text-[#0d253d] dark:text-white bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                  .env
                </code>
                .
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

        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md shadow-xs p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-medium text-[#0d253d] dark:text-white">
              <Zap className="size-4 text-amber-500" /> Automated Webhook Normalization
            </CardTitle>
            <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light">
              Deterministic state machine transitions for all providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-2.5 text-xs text-[#64748d] dark:text-[#8ca3ba] font-light leading-relaxed">
            <p>
              Point your merchant dashboards to the destination URLs above. OpenWrapper
              automatically validates cryptographic signatures (
              <code className="font-mono text-[11px] text-[#0d253d] dark:text-white bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                HMAC-SHA512
              </code>
              ,{" "}
              <code className="font-mono text-[11px] text-[#0d253d] dark:text-white bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                SHA-256
              </code>
              , or{" "}
              <code className="font-mono text-[11px] text-[#0d253d] dark:text-white bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                Stripe-Signature
              </code>
              ) and updates the transaction state from{" "}
              <span className="font-mono text-amber-500 font-medium">pending</span> to{" "}
              <span className="font-mono text-emerald-500 font-medium">succeeded</span> or{" "}
              <span className="font-mono text-[#ea2261] font-medium">failed</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
