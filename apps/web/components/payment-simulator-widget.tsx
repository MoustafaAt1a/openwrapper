"use client"

import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Globe,
  Store,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { CodeHighlighter } from "@/lib/code-syntax-highlighter"
import { formatMinorUnits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GooTabs, SlidingCardSelector } from "@/components/ui/goo-tabs"
import { GooLoader } from "@/components/ui/goo-loader"
import { Slider } from "@/components/ui/slider"

type ProviderMode = "paymob" | "fawry" | "stripe" | "mock"

function ProviderCard({ label, sub, shortSub, isActive }: { label: string; sub: string; shortSub: string; isActive: boolean }) {
  return (
    <div className="flex flex-col items-start p-2 sm:p-3 min-w-0">
      <div className="flex w-full items-center justify-between gap-1">
        <span className={`font-semibold text-[11px] sm:text-xs truncate ${isActive ? "text-primary" : "text-foreground"}`}>
          {label}
        </span>
        {isActive && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
      </div>
      <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate w-full">
        <span className="sm:hidden">{shortSub}</span>
        <span className="hidden sm:inline">{sub}</span>
      </span>
    </div>
  )
}

export function PaymentSimulatorWidget() {
  const [provider, setProvider] = useState<ProviderMode>("paymob")
  const [amount, setAmount] = useState<number>(25000) // 250.00 EGP
  const [currency, setCurrency] = useState("EGP")
  const [status, setStatus] = useState<"idle" | "processing" | "succeeded">("idle")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual")

  const fawryRefNumber = "94829104"
  const paymobIntentionId = "pm_int_8f921a4bc8"
  const stripeSessionId = "cs_live_9a87d6e12f"
  const mockRefNumber = "mock_tx_901a44c"

  function handleProviderChange(next: ProviderMode) {
    setProvider(next)
    setStatus("idle")
    if (next === "stripe") {
      setCurrency("USD")
      setAmount(2900)
    } else {
      setCurrency("EGP")
      setAmount(25000)
    }
  }

  function handleSimulate() {
    if (status === "processing") return
    setStatus("processing")
    setTimeout(() => {
      setStatus("succeeded")
    }, 1100)
  }

  const jsonResponse = {
    id: `pay_${provider}_9827419b8`,
    status: status === "succeeded" ? "successful" : "initiated",
    amount_minor_units: amount,
    currency,
    provider,
    idempotency_key: "idemp_2026_9a4b81c",
    created_at: new Date().toISOString(),
    next_action:
      provider === "fawry"
        ? {
            type: "pay_at_kiosk",
            reference: fawryRefNumber,
            instructions: "Pay at any retail kiosk or Aman POS using 8-digit reference code.",
          }
        : provider === "mock"
          ? {
              type: "redirect_to_url",
              url: `https://checkout.openwrapper.internal/mock/pay/${mockRefNumber}`,
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
    <div className="w-full rounded-2xl border border-border bg-card/90 backdrop-blur-md p-4 sm:p-7 stripe-card-shadow-lg transition-all">
      {/* Top Header Bar / Mode Switcher */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Live Gateway Sandbox
          </span>
        </div>

        {/* Pill Nav Group — Goo Morphing Tabs */}
        <GooTabs
          items={[
            { id: "visual", label: "Visual Checkout" },
            { id: "json", label: "REST JSON" },
          ]}
          activeId={viewMode}
          onTabChange={(id) => setViewMode(id as "visual" | "json")}
          className="bg-secondary border border-border"
          indicatorClassName="bg-primary shadow-sm"
          size="sm"
        />
      </div>

      {/* Provider Selector Tabs — Sliding Card Indicator */}
      <SlidingCardSelector
        items={[
          { id: "paymob", content: <ProviderCard label="Paymob" sub="Cards & Wallets" shortSub="Cards" isActive={provider === "paymob"} /> },
          { id: "fawry", content: <ProviderCard label="Fawry" sub="Cash at Kiosk" shortSub="Kiosks" isActive={provider === "fawry"} /> },
          { id: "stripe", content: <ProviderCard label="Stripe" sub="Global Cards" shortSub="Global" isActive={provider === "stripe"} /> },
          { id: "mock", content: <ProviderCard label="Mock Rail" sub="Zero-Network Sim" shortSub="Mock" isActive={provider === "mock"} /> },
        ]}
        activeId={provider}
        onSelect={(id) => handleProviderChange(id as ProviderMode)}
        className="grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-4"
      />

      {/* Main Dynamic Interactive Body */}
      {viewMode === "visual" ? (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
          {/* Amount selector & Price display */}
          <div className="flex flex-col gap-3 border-b border-border pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-mono uppercase text-muted-foreground">
                  Order Amount
                </span>
                <p className="text-2xl font-semibold font-tnum tracking-tight text-foreground">
                  {formatMinorUnits(amount, currency)}
                </p>
              </div>

              {/* Amount Presets — Sliding Indicator */}
              <GooTabs
                items={
                  currency === "USD"
                    ? [
                        { id: "2900", label: "$29" },
                        { id: "9900", label: "$99" },
                        { id: "24900", label: "$249" },
                      ]
                    : [
                        { id: "25000", label: "250 EGP" },
                        { id: "100000", label: "1,000 EGP" },
                        { id: "250000", label: "2,500 EGP" },
                      ]
                }
                activeId={String(amount)}
                onTabChange={(id) => {
                  setAmount(Number(id))
                  setStatus("idle")
                }}
                className="bg-card border border-border"
                indicatorClassName="bg-primary text-primary-foreground shadow-xs"
                size="sm"
              />
            </div>

            {/* Interactive Amount Range Slider */}
            <div className="pt-1">
              <Slider
                value={amount}
                min={currency === "USD" ? 1000 : 5000}
                max={currency === "USD" ? 50000 : 500000}
                step={currency === "USD" ? 500 : 2500}
                formatValue={(val) => formatMinorUnits(val, currency)}
                aria-label="Order Amount Slider"
                onChange={(val) => {
                  setAmount(val)
                  setStatus("idle")
                }}
              />
            </div>
          </div>

          {/* Provider-Specific Next-Action Display */}
          {provider === "paymob" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <CreditCard className="size-4 text-primary" />
                  Visa, Mastercard, Meeza & Mobile Wallets
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Intention ID
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {paymobIntentionId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hosted Checkout URL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-medium">
                    Lossless Next-Action <CheckCircle2 className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {provider === "fawry" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Store className="size-4 text-primary" />
                  Pay-at-Reference (180,000+ Kiosks)
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Fawry Payment Reference Code
                </span>
                <span className="font-mono font-tnum text-2xl sm:text-3xl font-bold tracking-wider sm:tracking-widest text-primary">
                  {fawryRefNumber}
                </span>
                <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
                  Valid for 72 hours. Customer presents this 8-digit number to any merchant POS
                  kiosk.
                </p>
              </div>
            </div>
          )}

          {provider === "stripe" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Globe className="size-4 text-primary" />
                  Multi-Currency Checkout Sessions
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Session ID
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {stripeSessionId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Settlement Currency</span>
                  <span className="font-mono font-tnum font-medium text-foreground">
                    USD (Minor Units: 2900)
                  </span>
                </div>
              </div>
            </div>
          )}

          {provider === "mock" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Zap className="size-4 text-emerald-500" />
                  Deterministic Zero-Network Mock Adapter
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Provider Reference
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {mockRefNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Deterministic Rules</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-medium">
                    %100==99 Decline | %100==88 Timeout
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button - Signature Electric Indigo Pill Button */}
          <Button
            size="xl"
            pill
            onClick={handleSimulate}
            disabled={status === "processing"}
            className="w-full stripe-card-shadow-sm hover:stripe-card-shadow-hover transition-all gap-2"
          >
            {status === "processing" ? (
              <span className="flex items-center gap-2 truncate">
                <GooLoader variant="spinner" size="sm" color="bg-primary-foreground" />
                <span className="truncate">Verifying Idempotency & Routing...</span>
              </span>
            ) : status === "succeeded" ? (
              <span className="flex items-center gap-2 truncate">
                <CheckCircle2 className="size-4 text-emerald-300 shrink-0" />
                <span className="truncate">201 Created — Dispatched via OpenWrapper</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Dispatch Unified Payment</span>
                <ArrowRight className="size-4 shrink-0" />
              </span>
            )}
          </Button>
        </div>
      ) : (
        /* JSON Response Inspector */
        <div className="mt-4 relative rounded-xl border border-border bg-secondary p-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-tnum">
              201 CREATED (12ms)
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(jsonResponse, null, 2))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
            >
              {copied ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>
          <div className="overflow-x-auto pt-3 text-[11px] leading-relaxed select-text">
            <CodeHighlighter code={JSON.stringify(jsonResponse, null, 2)} language="json" />
          </div>
        </div>
      )}
    </div>
  )
}

export const HeroPaymentWidget = PaymentSimulatorWidget
export default PaymentSimulatorWidget
