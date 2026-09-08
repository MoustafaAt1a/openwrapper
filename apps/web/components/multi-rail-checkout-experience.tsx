"use client"

import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Store,
  Zap,
} from "lucide-react"
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

export function MultiRailCheckoutExperience() {
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
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-7 stripe-card-shadow-sm">
            {/* Merchant Identity & Product Context */}
            <div className="border-b border-border pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">OpenWrapper Store</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                  Sandbox Preview
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                {plan === "pro"
                  ? "Developer Pro Tier"
                  : plan === "starter"
                    ? "Starter Rail Tier"
                    : "Custom Transaction"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 font-light leading-relaxed">
                Stateless MENA & global payment rails with automated fallback and instant telemetry.
              </p>
            </div>

            {/* Plan Tier Selector */}
            <div className="py-4 border-b border-border">
              <span className="text-xs font-medium text-foreground block mb-2.5">
                Billing option
              </span>
              <div
                id="plan-selector"
                role="radiogroup"
                aria-label="Billing option"
                className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-secondary border border-border"
              >
                <button
                  type="button"
                  onClick={() => setPlan("pro")}
                  className={cn(
                    "py-2 px-2.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "pro"
                      ? "bg-card text-foreground stripe-card-shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Pro Tier
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("starter")}
                  className={cn(
                    "py-2 px-2.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "starter"
                      ? "bg-card text-foreground stripe-card-shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Starter
                </button>
                <button
                  type="button"
                  onClick={() => setPlan("custom")}
                  className={cn(
                    "py-2 px-2.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer",
                    plan === "custom"
                      ? "bg-card text-foreground stripe-card-shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Price Headline with Currency Switcher */}
            <div className="py-5 border-b border-border">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-tnum">
                    {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 font-light">
                    {plan === "custom" ? "one-time test" : "/ month"}
                  </span>
                </div>

                {/* Currency Switcher */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="currency-select" className="text-xs text-muted-foreground">
                    Currency
                  </label>
                  {provider === "fawry" ? (
                    <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                      EGP
                    </span>
                  ) : (
                    <select
                      id="currency-select"
                      value={effectiveCurrency}
                      onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                      aria-label="Payment Currency"
                      className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground stripe-input-focus cursor-pointer"
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

              {/* Integrated Custom Amount Input & Quick Presets */}
              {plan === "custom" && (
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="custom-amount-input"
                      className="text-xs font-medium text-foreground"
                    >
                      Custom payment amount
                    </label>
                    <span className="text-[11px] text-muted-foreground">Min 1 · Max 100,000</span>
                  </div>

                  <div className="relative flex items-center rounded-lg border border-border bg-card stripe-card-shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                    <div className="flex items-center pl-3 pr-2.5 py-2.5 border-r border-border bg-secondary rounded-l-lg select-none">
                      <span className="text-xs font-semibold tracking-wide text-foreground">
                        {effectiveCurrency}
                      </span>
                    </div>
                    <input
                      id="custom-amount-input"
                      type="number"
                      step="any"
                      min="1"
                      max="100000"
                      value={customMajorAmount || ""}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value)
                        setCustomMajorAmount(Number.isNaN(val) ? 0 : val)
                      }}
                      aria-label="Custom payment amount"
                      placeholder="100.00"
                      className="w-full px-3 py-2 text-sm font-semibold font-tnum text-foreground bg-transparent border-0 outline-none no-spin"
                    />
                    <div className="pr-3 text-xs text-muted-foreground select-none font-light">
                      one-time
                    </div>
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[50, 100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomMajorAmount(preset)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                          customMajorAmount === preset
                            ? "bg-primary text-primary-foreground stripe-card-shadow-xs font-semibold"
                            : "bg-secondary text-muted-foreground hover:text-foreground border border-border",
                        )}
                      >
                        {preset} {effectiveCurrency}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Itemized Line Items Receipt */}
            <div className="py-4 border-b border-border flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  {plan === "pro"
                    ? "Developer Pro Subscription"
                    : plan === "starter"
                      ? "Starter Rail Subscription"
                      : "Custom Order"}
                </span>
                <span className="font-tnum text-foreground font-medium">
                  {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-tnum text-foreground">
                  {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Estimated Tax (0.00%)</span>
                <span className="font-tnum text-foreground">0.00 {effectiveCurrency}</span>
              </div>
            </div>

            {/* Total Due Today */}
            <div className="pt-4 flex items-baseline justify-between">
              <span className="font-medium text-sm text-foreground">Total Due Today</span>
              <span className="font-tnum text-2xl font-semibold text-foreground">
                {formatMinorUnits(amountMinorUnits, effectiveCurrency)}
              </span>
            </div>
          </div>

          {/* Trust Guarantee Card */}
          <div className="rounded-xl bg-secondary border border-border p-4 flex items-start gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground text-xs">
                Zero-knowledge cryptographic transit
              </span>
              <p className="font-light leading-relaxed text-[11px]">
                Merchant credentials and cardholder data never touch disk storage. Transactions
                execute over isolated TLS with idempotency protection.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods & Customer Checkout Form */}
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-8 stripe-card-shadow-md transition-depth hover:stripe-card-shadow-hover">
          {/* Header */}
          <div className="pb-5 border-b border-border">
            <h2 className="text-xl font-light tracking-tight text-foreground">Payment details</h2>
            <p className="text-xs text-muted-foreground mt-1 font-light">
              Select a payment rail to test unified transaction execution and telemetry.
            </p>
          </div>

          {/* Stripe / Polar Style Payment Method Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-5">
            {/* 1. Card Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("card")}
              className={cn(
                "rounded-lg border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "card"
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary stripe-card-shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-secondary",
              )}
            >
              <CreditCard
                className={cn(
                  "w-5 h-5",
                  method === "card" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-xs font-semibold text-foreground">Card</span>
              <span className="text-[10px] text-muted-foreground">Paymob/Stripe</span>
            </button>

            {/* 2. Fawry Kiosk Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("fawry")}
              className={cn(
                "rounded-lg border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "fawry"
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary stripe-card-shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-secondary",
              )}
            >
              <Store
                className={cn(
                  "w-5 h-5",
                  method === "fawry" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-xs font-semibold text-foreground">Fawry</span>
              <span className="text-[10px] text-muted-foreground">Kiosk Voucher</span>
            </button>

            {/* 3. Mobile Wallets Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("wallet")}
              className={cn(
                "rounded-lg border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "wallet"
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary stripe-card-shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-secondary",
              )}
            >
              <Smartphone
                className={cn(
                  "w-5 h-5",
                  method === "wallet" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-xs font-semibold text-foreground">Wallets</span>
              <span className="text-[10px] text-muted-foreground">Vodafone/Orange</span>
            </button>

            {/* 4. Deterministic Mock Rail */}
            <button
              type="button"
              onClick={() => handleMethodChange("mock")}
              className={cn(
                "rounded-lg border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer relative",
                method === "mock"
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary stripe-card-shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-secondary",
              )}
            >
              <Zap
                className={cn(
                  "w-5 h-5",
                  method === "mock" ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-xs font-semibold text-foreground">Mock Rail</span>
              <span className="text-[10px] text-muted-foreground">Offline Simulator</span>
            </button>
          </div>

          {/* Quick Mock Simulation Vector Chips (When in Mock Mode) */}
          {method === "mock" && (
            <div className="mb-5 rounded-lg bg-secondary p-3.5 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">
                  Simulation test scenarios
                </span>
                <span className="text-[11px] text-muted-foreground">Deterministic rule engine</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleMockTestVector("success")}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>200 Success</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMockTestVector("decline")}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  <span>402 Decline (.99)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMockTestVector("timeout")}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span>504 Timeout (.88)</span>
                </button>
              </div>
            </div>
          )}

          {/* Customer & Payment Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Customer Details */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-email" className="text-xs font-medium text-foreground">
                Email address
              </label>
              <Input
                id="customer-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="text-sm rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="customer-name" className="text-xs font-medium text-foreground">
                  Full name
                </label>
                <Input
                  id="customer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmed Ali"
                  className="text-sm rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="customer-phone" className="text-xs font-medium text-foreground">
                  Phone number
                </label>
                <Input
                  id="customer-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+201001234567"
                  className="text-sm font-tnum rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                />
              </div>
            </div>

            {/* Authentication Mode: Sandbox Toggle vs Custom API Key */}
            <div className="rounded-lg border border-border bg-secondary p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary" />
                  API authentication
                </span>
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-card border border-border">
                  <button
                    type="button"
                    onClick={() => setUseSandboxKey(true)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                      useSandboxKey
                        ? "bg-primary text-primary-foreground stripe-card-shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Demo Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseSandboxKey(false)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                      !useSandboxKey
                        ? "bg-primary text-primary-foreground stripe-card-shadow-xs font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Custom Key
                  </button>
                </div>
              </div>

              {useSandboxKey ? (
                <p className="text-xs font-light text-muted-foreground">
                  Using sandbox credential{" "}
                  <code className="font-mono text-[11px] bg-black/5 dark:bg-white/10 text-foreground px-1.5 py-0.5 rounded">
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
                    placeholder="ow_test_... or ow_live_..."
                    className="text-xs font-mono rounded-lg border-border bg-card h-9"
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>Manage keys in dashboard</span>
                    <Link
                      href="/dashboard/api-keys"
                      className="text-primary hover:underline flex items-center gap-0.5 font-medium"
                    >
                      API Keys ↗
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Signature Electric Indigo CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full font-medium text-sm bg-primary hover:bg-primary-deep text-primary-foreground stripe-card-shadow-sm hover:stripe-card-shadow-hover transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing payment...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Pay {formatMinorUnits(amountMinorUnits, effectiveCurrency)}</span>
                </span>
              )}
            </button>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Real-World Outcome Card */}
          {result && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 stripe-card-shadow-xs animate-in fade-in slide-in-from-bottom-3 duration-500">
              {/* Outcome Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Intention created ({result.status || "pending"})
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {result.payment_id || result.paymentId}
                </span>
              </div>

              {/* 1. FAWRY KIOSK OUTCOME: Authentic POS Voucher Ticket */}
              {result.next_action?.reference && (
                <div className="rounded-xl border border-emerald-500/30 bg-card p-5 stripe-card-shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
                    <span className="text-xs font-semibold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase">
                      Fawry Kiosk Voucher
                    </span>
                    <span className="text-xs text-muted-foreground">Valid 48 Hours</span>
                  </div>

                  {/* SVG Barcode Visual */}
                  <div className="flex justify-center py-1 opacity-80 dark:opacity-70">
                    <svg
                      width="220"
                      height="36"
                      viewBox="0 0 220 36"
                      fill="currentColor"
                      className="text-foreground"
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
                    <span className="text-xs text-muted-foreground block">
                      Kiosk Bill Reference Number
                    </span>
                    <span className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-foreground my-1 block">
                      {result.next_action.reference}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      pill
                      onClick={() => handleCopyReference(result.next_action?.reference || "")}
                      className="mt-2 text-xs gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCode ? "Reference Copied!" : "Copy Reference Code"}</span>
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="border-t border-dashed border-border pt-3 text-xs text-muted-foreground flex flex-col gap-1.5 font-light">
                    <span className="font-medium text-foreground">How to pay at kiosk:</span>
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
                <div className="rounded-xl border border-primary/20 bg-card p-5 stripe-card-shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Hosted 3DS Checkout Session Ready
                    </span>
                    <span className="text-[11px] text-muted-foreground">External Rail</span>
                  </div>

                  <p className="text-xs text-muted-foreground font-light leading-relaxed">
                    The payment gateway initialized the secure 3D-Secure authentication window.
                    Click below to complete card verification:
                  </p>

                  <Button
                    asChild
                    pill
                    className="w-full bg-primary hover:bg-primary-deep text-primary-foreground font-medium text-xs h-11 stripe-card-shadow-sm gap-2 cursor-pointer"
                  >
                    <a
                      href={safeHttpUrl(result.next_action?.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <span>Proceed to 3DS Verification</span>
                      <ExternalLink className="w-3.5 h-3.5" />
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
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ← Test Another Payment
                </Button>
                <Button asChild variant="outline" size="sm" pill className="text-xs">
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

export const CheckoutExperience = MultiRailCheckoutExperience
export default MultiRailCheckoutExperience
