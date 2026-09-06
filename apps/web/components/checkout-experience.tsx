"use client"

import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  CreditCardIcon,
  FlashIcon,
  Globe02Icon,
  Key01Icon,
  LinkSquare01Icon,
  Loading03Icon,
  LockIcon,
  ShieldCheckIcon,
  SmartPhone01Icon,
  Store01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatMinorUnits, safeHttpUrl } from "@/lib/utils"

export type SupportedProvider = "paymob" | "fawry" | "stripe" | "mock"
export type SupportedCurrency =
  | "EGP"
  | "USD"
  | "EUR"
  | "GBP"
  | "SAR"
  | "AED"
  | "KWD"
  | "BHD"
  | "OMR"
  | "JPY"

export type PlanKey = "pro" | "starter" | "custom"
export type PaymentMethodTab = "card" | "fawry" | "wallet" | "mock"

const PROVIDER_BY_METHOD: Record<PaymentMethodTab, SupportedProvider> = {
  card: "paymob",
  fawry: "fawry",
  wallet: "paymob",
  mock: "mock",
}

const CURRENCIES_BY_PROVIDER: Record<SupportedProvider, SupportedCurrency[]> = {
  paymob: ["EGP", "USD", "EUR", "SAR", "AED"],
  fawry: ["EGP"],
  stripe: ["USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY"],
  mock: ["EGP", "USD", "EUR", "GBP", "SAR", "AED", "KWD", "BHD", "OMR", "JPY"],
}

function getCurrencyMultiplier(c: string): number {
  if (c === "JPY") return 1
  if (c === "KWD" || c === "BHD" || c === "OMR") return 1000
  return 100
}

const PLAN_AMOUNTS: Record<"pro" | "starter", Record<string, number>> = {
  pro: {
    USD: 49,
    EUR: 45,
    GBP: 39,
    EGP: 1500,
    SAR: 185,
    AED: 180,
    KWD: 15,
    BHD: 18,
    OMR: 19,
    JPY: 7500,
  },
  starter: {
    USD: 19,
    EUR: 18,
    GBP: 15,
    EGP: 600,
    SAR: 70,
    AED: 70,
    KWD: 6,
    BHD: 7,
    OMR: 7,
    JPY: 2900,
  },
}

interface PaymentApiResponse {
  payment_id?: string
  paymentId?: string
  provider?: string
  provider_reference?: string
  providerReference?: string
  status?: string
  amount_minor_units?: number
  currency?: string
  next_action?: {
    type?: string
    url?: string
    reference?: string
    instructions?: string
  }
  error?: {
    code?: string
    message?: string
  }
}

export function CheckoutExperience() {
  const [method, setMethod] = useState<PaymentMethodTab>("card")
  const [plan, setPlan] = useState<PlanKey>("pro")
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")
  const [customMajorAmount, setCustomMajorAmount] = useState<number>(100)

  // Customer credentials
  const [name, setName] = useState("Ahmed Ali")
  const [email, setEmail] = useState("customer@example.com")
  const [phone, setPhone] = useState("+201001234567")

  // API Key Mode: default to frictionless Sandbox Demo Key
  const [useSandboxKey, setUseSandboxKey] = useState(true)
  const [customApiKey, setCustomApiKey] = useState("")

  // Submission state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PaymentApiResponse | null>(null)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)

  // Active provider based on method selection
  const provider = useMemo<SupportedProvider>(() => {
    if (method === "card") {
      // If global currency without EGP, prioritize Stripe if available
      return currency === "EGP" ? "paymob" : "stripe"
    }
    return PROVIDER_BY_METHOD[method]
  }, [method, currency])

  // Valid currencies for current rail
  const validCurrencies = useMemo(() => {
    return CURRENCIES_BY_PROVIDER[provider] || ["USD"]
  }, [provider])

  // Ensure current currency is valid for rail
  const effectiveCurrency: SupportedCurrency = useMemo(() => {
    if (provider === "fawry") return "EGP"
    if (!validCurrencies.includes(currency)) {
      return validCurrencies[0]
    }
    return currency
  }, [provider, validCurrencies, currency])

  // Calculate integer minor units adhering to Invariant I1
  const amountMinorUnits = useMemo<number>(() => {
    const multiplier = getCurrencyMultiplier(effectiveCurrency)
    if (plan === "custom") {
      return Math.max(1, Math.round((customMajorAmount || 1) * multiplier))
    }
    const defaultMajor = PLAN_AMOUNTS[plan][effectiveCurrency] ?? (plan === "pro" ? 49 : 19)
    return Math.round(defaultMajor * multiplier)
  }, [plan, effectiveCurrency, customMajorAmount])

  // Handle payment method change
  function handleMethodChange(newMethod: PaymentMethodTab) {
    setMethod(newMethod)
    if (newMethod === "fawry") {
      setCurrency("EGP")
      if (!phone.startsWith("+20")) {
        setPhone("+201001234567")
      }
    }
    setError("")
  }

  // Handle quick mock test vectors
  function handleMockTestVector(vector: "success" | "decline" | "timeout") {
    setMethod("mock")
    setPlan("custom")
    if (vector === "success") {
      setCustomMajorAmount(100)
    } else if (vector === "decline") {
      // Amount ending in 99 minor units
      setCustomMajorAmount(99.99)
    } else if (vector === "timeout") {
      // Amount ending in 88 minor units
      setCustomMajorAmount(88.88)
    }
  }

  // Copy voucher reference code
  function handleCopyReference(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
  }

  // Submit payment intention
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    const token = useSandboxKey ? "ow_test_sandbox_demo" : customApiKey.trim()

    if (!token) {
      setError("Please provide an API key or enable Sandbox Mode.")
      setLoading(false)
      return
    }

    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch("/api/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          provider,
          amount_minor_units: amountMinorUnits,
          currency: effectiveCurrency,
          customer: {
            phone,
            email,
            full_name: name,
          },
          merchant_reference: `ord_${crypto.randomUUID().slice(0, 8)}`,
          description: `OpenWrapper ${plan === "pro" ? "Pro Plan" : plan === "starter" ? "Starter Plan" : "Custom Order"}`,
        }),
      })

      const data = (await res.json()) as PaymentApiResponse
      if (!res.ok) {
        throw new Error(data.error?.message || "Payment request failed.")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment execution failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-8 sm:py-12">
      {/* 2-Column Polar / Stripe Checkout Grid */}
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-start">
        {/* Left Column: Order Summary & Itemized Breakdown */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,55,112,0.04)]">
            {/* Merchant Identity & Product Context */}
            <div className="border-b border-[#e3e8ee] dark:border-white/10 pb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
                  OpenWrapper Store
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Rails Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0d253d] dark:text-white">
                {plan === "pro"
                  ? "Developer Pro Tier"
                  : plan === "starter"
                    ? "Starter Rail Tier"
                    : "Custom Transaction"}
              </h1>
              <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] mt-1.5 font-light">
                Stateless MENA & global payment rails, automated fallback, and instant telemetry.
              </p>
            </div>

            {/* Plan Tier Selector (Polar.sh style) */}
            <div className="py-4 border-b border-[#e3e8ee] dark:border-white/10">
              <label
                htmlFor="plan-selector"
                className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block mb-2"
              >
                Select Package
              </label>
              <div
                id="plan-selector"
                className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#f6f9fc] dark:bg-[#141b33] border border-[#e3e8ee] dark:border-white/10"
              >
                <button
                  type="button"
                  onClick={() => setPlan("pro")}
                  className={cn(
                    "py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "pro"
                      ? "bg-white dark:bg-[#0f1426] text-[#0d253d] dark:text-white shadow-xs font-semibold"
                      : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]",
                  )}
                >
                  Pro Tier
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("starter")}
                  className={cn(
                    "py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "starter"
                      ? "bg-white dark:bg-[#0f1426] text-[#0d253d] dark:text-white shadow-xs font-semibold"
                      : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]",
                  )}
                >
                  Starter
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("custom")}
                  className={cn(
                    "py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "custom"
                      ? "bg-white dark:bg-[#0f1426] text-[#0d253d] dark:text-white shadow-xs font-semibold"
                      : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d]",
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Price Headline with Currency Switcher */}
            <div className="py-5 border-b border-[#e3e8ee] dark:border-white/10">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-3xl sm:text-4xl font-light tracking-tight text-[#0d253d] dark:text-white font-mono tabular-nums">
                    {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
                  </span>
                  <span className="text-xs text-[#64748d] dark:text-[#8ca3ba] ml-2 font-light">
                    {plan === "custom" ? "one-time test" : "/ month"}
                  </span>
                </div>

                {/* Currency Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-[#64748d] dark:text-[#8ca3ba]">
                    Currency:
                  </span>
                  {provider === "fawry" ? (
                    <span className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] px-2 py-1 font-mono text-xs font-medium text-[#0d253d] dark:text-white">
                      EGP
                    </span>
                  ) : (
                    <select
                      value={effectiveCurrency}
                      onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                      aria-label="Payment Currency"
                      className="rounded-lg border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] px-2 py-1 font-mono text-xs font-medium text-[#0d253d] dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#533afd] cursor-pointer"
                    >
                      {validCurrencies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Custom Amount Input when in Custom mode */}
              {plan === "custom" && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#f6f9fc] dark:bg-[#141b33] p-3 border border-[#e3e8ee] dark:border-white/10">
                  <span className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-mono">
                    Custom Amount:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-medium text-[#0d253d] dark:text-white">
                      {effectiveCurrency}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="100000"
                      value={customMajorAmount}
                      onChange={(e) => setCustomMajorAmount(Number(e.target.value))}
                      aria-label="Custom payment amount"
                      className="w-28 rounded-lg border border-[#e3e8ee] dark:border-white/15 bg-white dark:bg-[#0f1426] px-2.5 py-1 text-right font-mono font-tnum text-xs font-medium text-[#0d253d] dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#533afd]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Itemized Line Items Receipt */}
            <div className="py-4 border-b border-[#e3e8ee] dark:border-white/10 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba]">
                <span>
                  {plan === "pro"
                    ? "Developer Pro Subscription"
                    : plan === "starter"
                      ? "Starter Engine Subscription"
                      : "Custom Amount Intention"}
                </span>
                <span className="font-mono tabular-nums text-[#0d253d] dark:text-white font-medium">
                  {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba]">
                <span>Stateless Multi-Rail Redundancy</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  Included
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba]">
                <span>Idempotency & Replay Shield</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  Included
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748d] dark:text-[#8ca3ba] pt-1">
                <span>Estimated Tax (0.00%)</span>
                <span className="font-mono tabular-nums text-[#0d253d] dark:text-white">
                  0.00 {effectiveCurrency}
                </span>
              </div>
            </div>

            {/* Total Due Today */}
            <div className="pt-4 flex items-baseline justify-between">
              <span className="font-medium text-sm text-[#0d253d] dark:text-white">
                Total Due Today
              </span>
              <span className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-[#0d253d] dark:text-white">
                {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
              </span>
            </div>
          </div>

          {/* Trust Guarantee Card */}
          <div className="rounded-2xl bg-[#f6f9fc] dark:bg-[#141b33] border border-[#e3e8ee] dark:border-white/10 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-[#64748d] dark:text-[#8ca3ba]">
            <HugeiconsIcon
              icon={ShieldCheckIcon}
              size={20}
              className="text-emerald-500 shrink-0 mt-0.5"
            />
            <div className="flex flex-col gap-1">
              <span className="font-medium text-[#0d253d] dark:text-white">
                Zero-Knowledge Cryptographic Transit
              </span>
              <p className="font-light leading-relaxed">
                Merchant secrets and cardholder numbers never touch disk storage. In-flight requests
                execute over isolated TLS with deterministic state reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods & Customer Checkout Form */}
        <div className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,55,112,0.06)]">
          {/* Header */}
          <div className="pb-5 border-b border-[#e3e8ee] dark:border-white/10">
            <h2 className="text-xl font-light tracking-tight text-[#0d253d] dark:text-white">
              Payment Method
            </h2>
            <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] mt-1 font-light">
              Select your payment rail. OpenWrapper abstracts provider specifics transparently.
            </p>
          </div>

          {/* Stripe / Polar Style Payment Method Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-5">
            {/* 1. Card Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("card")}
              className={cn(
                "rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "card"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]",
              )}
            >
              <HugeiconsIcon
                icon={CreditCardIcon}
                size={20}
                className={method === "card" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-xs font-semibold">Card</span>
              <span className="text-[10px] font-mono opacity-80">Paymob/Stripe</span>
            </button>

            {/* 2. Fawry Kiosk Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("fawry")}
              className={cn(
                "rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "fawry"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]",
              )}
            >
              <HugeiconsIcon
                icon={Store01Icon}
                size={20}
                className={method === "fawry" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-xs font-semibold">Fawry</span>
              <span className="text-[10px] font-mono opacity-80">Kiosk Code</span>
            </button>

            {/* 3. Mobile Wallets Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("wallet")}
              className={cn(
                "rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "wallet"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]",
              )}
            >
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                size={20}
                className={method === "wallet" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-xs font-semibold">Wallets</span>
              <span className="text-[10px] font-mono opacity-80">Vodafone/Orange</span>
            </button>

            {/* 4. Deterministic Mock Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("mock")}
              className={cn(
                "rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "mock"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]",
              )}
            >
              <HugeiconsIcon
                icon={FlashIcon}
                size={20}
                className={method === "mock" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-xs font-semibold">Mock Rail</span>
              <span className="text-[10px] font-mono opacity-80">Test Simulator</span>
            </button>
          </div>

          {/* Quick Mock Simulation Vector Chips (When in Mock Mode) */}
          {method === "mock" && (
            <div className="mb-5 rounded-xl bg-[#f6f9fc] dark:bg-[#141b33] p-3.5 border border-[#e3e8ee] dark:border-white/10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba] block mb-2">
                Deterministic Simulator Vectors
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleMockTestVector("success")}
                  className="rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-mono cursor-pointer transition-colors"
                >
                  ✓ 200 OK (Success)
                </button>
                <button
                  type="button"
                  onClick={() => handleMockTestVector("decline")}
                  className="rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 px-3 py-1 text-xs font-mono cursor-pointer transition-colors"
                >
                  ✕ 402 Decline (ends in .99)
                </button>
                <button
                  type="button"
                  onClick={() => handleMockTestVector("timeout")}
                  className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 text-xs font-mono cursor-pointer transition-colors"
                >
                  ⏳ 504 Timeout (ends in .88)
                </button>
              </div>
            </div>
          )}

          {/* Customer & Payment Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Customer Details */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="customer-email"
                className="text-xs font-mono font-medium text-[#0d253d] dark:text-white"
              >
                Email Address
              </label>
              <Input
                id="customer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="font-mono text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="customer-name"
                  className="text-xs font-mono font-medium text-[#0d253d] dark:text-white"
                >
                  Full Name
                </label>
                <Input
                  id="customer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmed Ali"
                  className="text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="customer-phone"
                  className="text-xs font-mono font-medium text-[#0d253d] dark:text-white"
                >
                  Phone Number
                </label>
                <Input
                  id="customer-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+201001234567"
                  className="font-mono text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
                />
              </div>
            </div>

            {/* Authentication Mode: Sandbox Toggle vs Custom API Key */}
            <div className="rounded-xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-[#0d253d] dark:text-white flex items-center gap-1.5">
                  <HugeiconsIcon icon={Key01Icon} size={14} className="text-[#533afd]" />
                  API Key Mode
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseSandboxKey(true)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer",
                      useSandboxKey
                        ? "bg-[#533afd] text-white font-semibold"
                        : "text-[#64748d] hover:text-[#0d253d]",
                    )}
                  >
                    Demo Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSandboxKey(false)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer",
                      !useSandboxKey
                        ? "bg-[#533afd] text-white font-semibold"
                        : "text-[#64748d] hover:text-[#0d253d]",
                    )}
                  >
                    Custom Key
                  </button>
                </div>
              </div>

              {useSandboxKey ? (
                <p className="text-[11px] font-light text-[#64748d] dark:text-[#8ca3ba]">
                  Frictionless sandbox testing enabled. Using pre-authenticated test key{" "}
                  <code className="font-mono text-[10px] bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">
                    ow_test_sandbox_demo
                  </code>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 pt-1">
                  <Input
                    type="password"
                    required
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="ow_live_... or paste from Dashboard"
                    className="font-mono text-xs rounded-lg border-[#e3e8ee] dark:border-white/15 bg-white dark:bg-[#0f1426] h-9"
                  />
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#64748d]">
                    <span>Need your API key?</span>
                    <Link
                      href="/dashboard/api-keys"
                      className="text-[#533afd] hover:underline flex items-center gap-0.5"
                    >
                      Manage API Keys ↗
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Signature Electric Indigo CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full font-medium text-sm bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white shadow-[0_4px_14px_rgba(83,58,253,0.3)] hover:shadow-[0_6px_20px_rgba(83,58,253,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                  <span>Processing via OpenWrapper Gateway...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={LockIcon} size={15} />
                  <span>
                    Pay {formatMinorUnits(amountMinorUnits, effectiveCurrency)} with{" "}
                    {provider.toUpperCase()}
                  </span>
                </span>
              )}
            </button>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 rounded-xl border border-[#ea2261]/20 bg-[#ea2261]/5 p-3.5 text-xs text-[#ea2261] font-mono">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Real-World Outcome Card */}
          {result && (
            <div className="mt-6 rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Outcome Header */}
              <div className="flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-3">
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                  Intention Created ({result.status || "pending"})
                </span>
                <span className="text-[11px] font-mono text-[#64748d] dark:text-[#8ca3ba]">
                  {result.payment_id || result.paymentId}
                </span>
              </div>

              {/* 1. FAWRY KIOSK OUTCOME: Authentic POS Voucher Ticket */}
              {result.next_action?.reference && (
                <div className="rounded-xl border border-emerald-500/30 bg-white dark:bg-[#0f1426] p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-dashed border-[#e3e8ee] dark:border-white/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        FAWRY KIOSK VOUCHER
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#64748d]">Valid 48 Hours</span>
                  </div>

                  {/* SVG Barcode Visual */}
                  <div className="flex justify-center py-1 opacity-80 dark:opacity-70">
                    <svg
                      width="220"
                      height="36"
                      viewBox="0 0 220 36"
                      fill="currentColor"
                      className="text-[#0d253d] dark:text-white"
                      aria-label="Kiosk reference barcode"
                    >
                      <rect x="0" y="0" width="3" height="36" />
                      <rect x="6" y="0" width="2" height="36" />
                      <rect x="11" y="0" width="4" height="36" />
                      <rect x="18" y="0" width="1" height="36" />
                      <rect x="22" y="0" width="3" height="36" />
                      <rect x="28" y="0" width="2" height="36" />
                      <rect x="33" y="0" width="5" height="36" />
                      <rect x="41" y="0" width="2" height="36" />
                      <rect x="46" y="0" width="1" height="36" />
                      <rect x="50" y="0" width="4" height="36" />
                      <rect x="57" y="0" width="2" height="36" />
                      <rect x="62" y="0" width="3" height="36" />
                      <rect x="68" y="0" width="1" height="36" />
                      <rect x="72" y="0" width="4" height="36" />
                      <rect x="79" y="0" width="2" height="36" />
                      <rect x="84" y="0" width="3" height="36" />
                      <rect x="90" y="0" width="1" height="36" />
                      <rect x="94" y="0" width="5" height="36" />
                      <rect x="102" y="0" width="2" height="36" />
                      <rect x="107" y="0" width="3" height="36" />
                      <rect x="113" y="0" width="1" height="36" />
                      <rect x="117" y="0" width="4" height="36" />
                      <rect x="124" y="0" width="2" height="36" />
                      <rect x="129" y="0" width="3" height="36" />
                      <rect x="135" y="0" width="1" height="36" />
                      <rect x="139" y="0" width="4" height="36" />
                      <rect x="146" y="0" width="2" height="36" />
                      <rect x="151" y="0" width="3" height="36" />
                      <rect x="157" y="0" width="1" height="36" />
                      <rect x="161" y="0" width="5" height="36" />
                      <rect x="169" y="0" width="2" height="36" />
                      <rect x="174" y="0" width="3" height="36" />
                      <rect x="180" y="0" width="1" height="36" />
                      <rect x="184" y="0" width="4" height="36" />
                      <rect x="191" y="0" width="2" height="36" />
                      <rect x="196" y="0" width="3" height="36" />
                      <rect x="202" y="0" width="1" height="36" />
                      <rect x="206" y="0" width="4" height="36" />
                      <rect x="213" y="0" width="3" height="36" />
                      <rect x="218" y="0" width="2" height="36" />
                    </svg>
                  </div>

                  {/* Kiosk Reference Code */}
                  <div className="text-center py-2">
                    <span className="text-[10px] font-mono text-[#64748d] uppercase tracking-wider block">
                      Kiosk Bill Reference Number
                    </span>
                    <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-[#0d253d] dark:text-white my-1 block">
                      {result.next_action.reference}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyReference(result.next_action?.reference || "")}
                      className="mt-2 font-mono text-xs rounded-full gap-1.5 cursor-pointer"
                    >
                      <HugeiconsIcon icon={copiedCode ? Tick01Icon : Copy01Icon} size={13} />
                      <span>{copiedCode ? "Reference Copied!" : "Copy Reference Code"}</span>
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="border-t border-dashed border-[#e3e8ee] dark:border-white/15 pt-3 text-xs text-[#64748d] dark:text-[#8ca3ba] flex flex-col gap-1.5 font-light">
                    <span className="font-medium text-[#0d253d] dark:text-white">
                      How to pay at kiosk:
                    </span>
                    <ol className="list-decimal pl-4 flex flex-col gap-1 text-[11px] leading-relaxed">
                      <li>
                        Visit any of 180,000+ Fawry POS terminals, Aman shops, or Post Offices.
                      </li>
                      <li>
                        Ask the storekeeper for &quot;Fawry Pay / OpenWrapper Bill Payment&quot;.
                      </li>
                      <li>Provide the 9-digit reference number above and pay in cash.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 2. 3DS HOSTED REDIRECT OUTCOME (Paymob / Stripe / Mock) */}
              {safeHttpUrl(result.next_action?.url) && (
                <div className="rounded-xl border border-[#533afd]/20 bg-white dark:bg-[#0f1426] p-5 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#e3e8ee] dark:border-white/10 pb-3">
                    <span className="font-mono text-xs font-semibold text-[#533afd] flex items-center gap-1.5">
                      <HugeiconsIcon icon={Globe02Icon} size={15} />
                      Hosted 3DS Checkout Session Ready
                    </span>
                    <span className="text-[10px] font-mono text-[#64748d]">External Rail</span>
                  </div>

                  <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] font-light">
                    The payment gateway initialized the secure 3D-Secure authentication window.
                    Click below to complete card verification:
                  </p>

                  <Button
                    asChild
                    className="w-full rounded-full bg-[#533afd] hover:bg-[#4434d4] text-white font-medium text-xs h-11 shadow-sm gap-2"
                  >
                    <a
                      href={safeHttpUrl(result.next_action?.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <span>Proceed to 3DS Verification</span>
                      <HugeiconsIcon icon={LinkSquare01Icon} size={14} />
                    </a>
                  </Button>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResult(null)}
                  className="font-mono text-xs text-[#64748d] hover:text-[#0d253d] cursor-pointer"
                >
                  ← Test Another Payment
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs rounded-full"
                >
                  <Link href="/dashboard/payments">View Ledger ↗</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
