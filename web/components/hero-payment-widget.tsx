"use client"

import { useState } from "react"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Globe2,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  Terminal,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ProviderMode = "paymob" | "fawry" | "stripe"

export function HeroPaymentWidget() {
  const [provider, setProvider] = useState<ProviderMode>("paymob")
  const [amount, setAmount] = useState<number>(25000) // 250.00 EGP
  const [currency, setCurrency] = useState("EGP")
  const [status, setStatus] = useState<"idle" | "processing" | "succeeded">("idle")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual")

  const fawryRefNumber = "94829104"
  const paymobIntentionId = "pm_int_8f921a4bc8"
  const stripeSessionId = "cs_live_9a87d6e12f"

  function handleProviderChange(newProvider: ProviderMode) {
    setProvider(newProvider)
    setStatus("idle")
    if (newProvider === "stripe") {
      setCurrency("USD")
      setAmount(2900) // $29.00
    } else {
      setCurrency("EGP")
      setAmount(25000) // 250.00 EGP
    }
  }

  function handleSimulate() {
    setStatus("processing")
    setTimeout(() => {
      setStatus("succeeded")
    }, 600)
  }

  const jsonResponse = {
    payment_id: `pay_${provider}_${provider === "fawry" ? fawryRefNumber : provider === "paymob" ? "8f921a" : "9a87d6"}`,
    provider,
    provider_reference:
      provider === "fawry" ? fawryRefNumber : provider === "paymob" ? paymobIntentionId : stripeSessionId,
    status: status === "succeeded" ? "succeeded" : "pending",
    amount_minor_units: amount,
    currency,
    merchant_reference: "ord_2026_089",
    next_action:
      provider === "fawry"
        ? {
            type: "pay_at_reference",
            reference: fawryRefNumber,
            instructions: "Pay at any retail kiosk or Aman POS using 8-digit reference code.",
          }
        : {
            type: "redirect_to_url",
            url:
              provider === "paymob"
                ? "https://accept.paymob.com/unifiedcheckout/?intention=pm_int_8f921a4bc8"
                : "https://checkout.stripe.com/c/pay/cs_live_9a87d6e12f",
          },
  }

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xl shadow-black/5 transition-all">
      {/* Top Header Bar / Mode Switcher */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Live Gateway Sandbox
          </span>
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
            OpenAPI 3.1
          </Badge>
        </div>

        {/* Pill Nav Group (Cal.com style) */}
        <div className="inline-flex rounded-full bg-muted/60 p-1 border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("visual")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              viewMode === "visual"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Visual Checkout
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`rounded-full px-3 py-1 font-medium font-mono text-[11px] transition-all ${
              viewMode === "json"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            REST JSON
          </button>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 pt-4">
        {(
          [
            { id: "paymob", label: "Paymob", sub: "Cards & Wallets", badge: "Egypt / MEA" },
            { id: "fawry", label: "Fawry", sub: "Cash at Kiosk", badge: "Egypt" },
            { id: "stripe", label: "Stripe", sub: "Global Cards", badge: "Global" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleProviderChange(item.id)}
            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              provider === item.id
                ? "border-foreground bg-secondary/80 shadow-2xs ring-1 ring-foreground/10"
                : "border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold text-xs text-foreground">{item.label}</span>
              {provider === item.id && <span className="size-1.5 rounded-full bg-primary" />}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</span>
          </button>
        ))}
      </div>

      {/* Main Dynamic Interactive Body */}
      {viewMode === "visual" ? (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5">
          {/* Amount selector & Price display */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase text-muted-foreground">Order Amount</span>
              <p className="text-xl font-bold font-mono tracking-tight text-foreground">
                {(amount / 100).toFixed(2)} {currency}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { label: currency === "USD" ? "$29" : "250 EGP", val: currency === "USD" ? 2900 : 25000 },
                { label: currency === "USD" ? "$99" : "1,000 EGP", val: currency === "USD" ? 9900 : 100000 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    setAmount(preset.val)
                    setStatus("idle")
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                    amount === preset.val
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider-Specific Next-Action Display */}
          {provider === "paymob" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-primary" /> Visa, Mastercard, Meeza & Mobile Wallets
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  HMAC-SHA512
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">Intention ID</span>
                  <span className="font-mono text-xs text-muted-foreground">{paymobIntentionId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hosted Checkout URL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                    Lossless Next-Action <CheckCircle2 className="size-3" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {provider === "fawry" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Store className="size-3.5 text-primary" /> Pay-at-Reference at 180,000+ Retail Outlets
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  SHA-256 Signatures
                </span>
              </div>

              <div className="rounded-lg border border-border/80 bg-card p-4 flex flex-col items-center justify-center gap-1.5 text-center">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Fawry Payment Reference Code
                </span>
                <span className="font-mono text-3xl font-black tracking-widest text-primary">
                  {fawryRefNumber}
                </span>
                <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                  Valid for 72 hours. Customer presents this 8-digit number to any merchant POS kiosk.
                </p>
              </div>
            </div>
          )}

          {provider === "stripe" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Globe2 className="size-3.5 text-primary" /> Multi-Currency Checkout Sessions
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Stripe-Signature
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">Session ID</span>
                  <span className="font-mono text-xs text-muted-foreground">{stripeSessionId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Settlement Currency</span>
                  <span className="font-mono font-semibold text-foreground">USD (Minor Units: 2900)</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleSimulate}
            disabled={status === "processing"}
            className="w-full h-10 rounded-md font-semibold text-xs bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all"
          >
            {status === "processing" ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="size-3.5 animate-spin" /> Verifying Idempotency & Routing...
              </span>
            ) : status === "succeeded" ? (
              <span className="flex items-center gap-2 text-emerald-300">
                <Check className="size-4" /> 201 Created — Dispatched via OpenWrapper Engine
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Dispatch Unified Payment <ArrowRight className="size-3.5" />
              </span>
            )}
          </Button>
        </div>
      ) : (
        /* JSON Response Inspector */
        <div className="mt-4 relative rounded-xl border border-border/70 bg-muted/40 p-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/40 text-[11px] text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">201 CREATED (12ms)</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(jsonResponse, null, 2))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>
          <pre className="overflow-x-auto pt-3 text-[11px] leading-relaxed select-all">
            <code>{JSON.stringify(jsonResponse, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Bottom Telemetry Badges */}
      <div className="mt-4 grid grid-cols-3 border-t border-border/60 pt-3 text-center text-muted-foreground font-mono text-[11px]">
        <div className="border-r border-border/50 px-2 flex items-center justify-center gap-1">
          <ShieldCheck className="size-3 text-emerald-500" />
          <span>SHA-256 Idempotent</span>
        </div>
        <div className="border-r border-border/50 px-2 flex items-center justify-center gap-1">
          <Zap className="size-3 text-amber-500" />
          <span>12ms Latency</span>
        </div>
        <div className="px-2 flex items-center justify-center gap-1">
          <KeyRound className="size-3 text-primary" />
          <span>Hashed at Rest</span>
        </div>
      </div>
    </div>
  )
}
