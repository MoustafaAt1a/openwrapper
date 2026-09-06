"use client"

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  CreditCardIcon,
  FlashIcon,
  Globe02Icon,
  Key01Icon,
  Loading03Icon,
  ShieldCheckIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { CodeHighlighter } from "@/lib/code-highlighter"

type ProviderMode = "paymob" | "fawry" | "stripe" | "mock"

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
  const mockRefNumber = "mock_ref_8f921a4bc8"

  function handleProviderChange(newProvider: ProviderMode) {
    setProvider(newProvider)
    setStatus("idle")
    if (newProvider === "stripe") {
      setCurrency("USD")
      setAmount(2900) // $29.00
    } else if (newProvider === "mock") {
      setCurrency("USD")
      setAmount(10000) // $100.00
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
    payment_id: `pay_${provider}_${provider === "fawry" ? fawryRefNumber : provider === "paymob" ? "8f921a" : provider === "stripe" ? "9a87d6" : "mock01"}`,
    provider,
    provider_reference:
      provider === "fawry"
        ? fawryRefNumber
        : provider === "paymob"
          ? paymobIntentionId
          : provider === "stripe"
            ? stripeSessionId
            : mockRefNumber,
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
    <div className="w-full rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white/90 dark:bg-[#0f1426]/90 backdrop-blur-md p-4 sm:p-7 shadow-[0_12px_36px_rgba(0,55,112,0.09)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all">
      {/* Top Header Bar / Mode Switcher */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e3e8ee]/80 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0d253d] dark:text-white">
            Live Gateway Sandbox
          </span>
        </div>

        {/* Pill Nav Group */}
        <div className="inline-flex rounded-full bg-[#f6f9fc] dark:bg-[#141b33] p-1 border border-[#e3e8ee]/70 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("visual")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              viewMode === "visual"
                ? "bg-white dark:bg-[#0f1426] text-[#0d253d] dark:text-white shadow-2xs font-semibold"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
            }`}
          >
            Visual Checkout
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`rounded-full px-3 py-1 font-medium font-mono text-[11px] transition-all ${
              viewMode === "json"
                ? "bg-white dark:bg-[#0f1426] text-[#0d253d] dark:text-white shadow-2xs font-semibold"
                : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
            }`}
          >
            REST JSON
          </button>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-4">
        {(
          [
            {
              id: "paymob",
              label: "Paymob",
              sub: "Cards & Wallets",
              shortSub: "Cards",
              badge: "Egypt / MEA",
            },
            {
              id: "fawry",
              label: "Fawry",
              sub: "Cash at Kiosk",
              shortSub: "Kiosks",
              badge: "Egypt",
            },
            {
              id: "stripe",
              label: "Stripe",
              sub: "Global Cards",
              shortSub: "Global",
              badge: "Global",
            },
            {
              id: "mock",
              label: "Mock Rail",
              sub: "Zero-Network Sim",
              shortSub: "Mock",
              badge: "CI / Dev",
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleProviderChange(item.id)}
            className={`flex flex-col items-start p-2 sm:p-3 rounded-xl border text-left transition-all min-w-0 ${
              provider === item.id
                ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 shadow-2xs ring-1 ring-[#533afd]/40"
                : "border-[#e3e8ee]/80 dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 hover:bg-[#f6f9fc] dark:hover:bg-[#141b33] hover:border-[#a8c3de]"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-1">
              <span
                className={`font-semibold text-[11px] sm:text-xs truncate ${
                  provider === item.id
                    ? "text-[#533afd] dark:text-[#8c82fc]"
                    : "text-[#0d253d] dark:text-white"
                }`}
              >
                {item.label}
              </span>
              {provider === item.id && (
                <span className="size-1.5 rounded-full bg-[#533afd] shrink-0" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#64748d] dark:text-[#8ca3ba] mt-0.5 truncate w-full">
              <span className="sm:hidden">{item.shortSub}</span>
              <span className="hidden sm:inline">{item.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Main Dynamic Interactive Body */}
      {viewMode === "visual" ? (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/60 dark:bg-[#141b33]/30 p-4 sm:p-5">
          {/* Amount selector & Price display */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3e8ee]/70 dark:border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase text-[#64748d] dark:text-[#8ca3ba]">
                Order Amount
              </span>
              <p className="text-2xl font-semibold font-tnum tracking-tight text-[#0d253d] dark:text-white">
                {(amount / 100).toFixed(2)} {currency}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                {
                  label: currency === "USD" ? "$29" : "250 EGP",
                  val: currency === "USD" ? 2900 : 25000,
                },
                {
                  label: currency === "USD" ? "$99" : "1,000 EGP",
                  val: currency === "USD" ? 9900 : 100000,
                },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    setAmount(preset.val)
                    setStatus("idle")
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-mono font-tnum transition-all ${
                    amount === preset.val
                      ? "bg-[#533afd] text-white font-medium shadow-2xs"
                      : "bg-white dark:bg-[#0f1426] border border-[#e3e8ee] dark:border-white/15 text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
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
              <div className="flex items-center justify-between text-xs text-[#64748d] dark:text-[#8ca3ba]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HugeiconsIcon icon={CreditCardIcon} size={15} className="text-[#533afd]" />
                  Visa, Mastercard, Meeza & Mobile Wallets
                </span>
              </div>

              <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#64748d] dark:text-[#8ca3ba]">
                    Intention ID
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white">
                    {paymobIntentionId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748d] dark:text-[#8ca3ba]">Hosted Checkout URL</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1 font-medium">
                    Lossless Next-Action <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {provider === "fawry" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[#64748d] dark:text-[#8ca3ba]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HugeiconsIcon icon={Store01Icon} size={15} className="text-[#533afd]" />
                  Pay-at-Reference (180,000+ Kiosks)
                </span>
              </div>

              <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-4 flex flex-col items-center justify-center gap-1 text-center shadow-2xs">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
                  Fawry Payment Reference Code
                </span>
                <span className="font-mono font-tnum text-2xl sm:text-3xl font-bold tracking-wider sm:tracking-widest text-[#533afd]">
                  {fawryRefNumber}
                </span>
                <p className="text-[11px] text-[#64748d] dark:text-[#8ca3ba] max-w-xs mt-1">
                  Valid for 72 hours. Customer presents this 8-digit number to any merchant POS
                  kiosk.
                </p>
              </div>
            </div>
          )}

          {provider === "stripe" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[#64748d] dark:text-[#8ca3ba]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HugeiconsIcon icon={Globe02Icon} size={15} className="text-[#533afd]" />
                  Multi-Currency Checkout Sessions
                </span>
              </div>

              <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#64748d] dark:text-[#8ca3ba]">
                    Session ID
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white">
                    {stripeSessionId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748d] dark:text-[#8ca3ba]">Settlement Currency</span>
                  <span className="font-mono font-tnum font-medium text-[#0d253d] dark:text-white">
                    USD (Minor Units: 2900)
                  </span>
                </div>
              </div>
            </div>
          )}

          {provider === "mock" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-[#64748d] dark:text-[#8ca3ba]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HugeiconsIcon icon={FlashIcon} size={15} className="text-emerald-500" />
                  Deterministic Zero-Network Mock Adapter
                </span>
              </div>

              <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#64748d] dark:text-[#8ca3ba]">
                    Provider Reference
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#0d253d] dark:text-white">
                    {mockRefNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748d] dark:text-[#8ca3ba]">Deterministic Rules</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-medium">
                    %100==99 Decline | %100==88 Timeout
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button - Signature Electric Indigo Pill Button */}
          <button
            type="button"
            onClick={handleSimulate}
            disabled={status === "processing"}
            className="w-full min-h-[44px] h-auto py-2.5 sm:py-3 px-3 sm:px-4 rounded-full font-medium text-xs sm:text-sm bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {status === "processing" ? (
              <span className="flex items-center gap-2 truncate">
                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin shrink-0" />
                <span className="truncate">Verifying Idempotency & Routing...</span>
              </span>
            ) : status === "succeeded" ? (
              <span className="flex items-center gap-2 text-white truncate">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={17}
                  className="text-emerald-300 shrink-0"
                />
                <span className="truncate">201 Created — Dispatched via OpenWrapper</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Dispatch Unified Payment</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="shrink-0" />
              </span>
            )}
          </button>
        </div>
      ) : (
        /* JSON Response Inspector */
        <div className="mt-4 relative rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#e3e8ee] dark:border-white/10 text-[11px] text-[#64748d] dark:text-[#8ca3ba]">
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
              className="flex items-center gap-1.5 hover:text-[#533afd] transition-colors"
            >
              {copied ? (
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  className="text-emerald-500"
                />
              ) : (
                <HugeiconsIcon icon={Copy01Icon} size={14} />
              )}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>
          <div className="overflow-x-auto pt-3 text-[11px] leading-relaxed select-text">
            <CodeHighlighter
              code={JSON.stringify(jsonResponse, null, 2)}
              language="json"
            />
          </div>
        </div>
      )}

      {/* Bottom Telemetry Badges */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-0 border-t border-[#e3e8ee]/80 dark:border-white/10 pt-3.5 text-center text-[#64748d] dark:text-[#8ca3ba] font-mono text-[11px]">
        <div className="sm:border-r border-[#e3e8ee] dark:border-white/10 px-2 flex items-center justify-center gap-1.5">
          <HugeiconsIcon icon={ShieldCheckIcon} size={14} className="text-emerald-500 shrink-0" />
          <span className="truncate">SHA-256 Verified</span>
        </div>
        <div className="sm:border-r border-[#e3e8ee] dark:border-white/10 px-2 flex items-center justify-center gap-1.5">
          <HugeiconsIcon icon={FlashIcon} size={14} className="text-amber-500 shrink-0" />
          <span className="truncate font-tnum">12ms Latency</span>
        </div>
        <div className="px-2 flex items-center justify-center gap-1.5">
          <HugeiconsIcon icon={Key01Icon} size={14} className="text-[#533afd] shrink-0" />
          <span className="truncate">Hashed at Rest</span>
        </div>
      </div>
    </div>
  )
}
