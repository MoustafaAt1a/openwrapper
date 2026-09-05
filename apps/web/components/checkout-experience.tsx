"use client"

import {
  CheckmarkCircle01Icon,
  CreditCardIcon,
  Globe02Icon,
  LinkSquare01Icon,
  Loading03Icon,
  ShieldCheckIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { safeHttpUrl } from "@/lib/utils"

interface PaymentResult {
  payment_id?: string
  paymentId?: string
  next_action?: {
    url?: string
    reference?: string
  }
}

export function CheckoutExperience() {
  const [provider, setProvider] = useState<"paymob" | "fawry" | "stripe">("paymob")
  const [currency, setCurrency] = useState<"EGP" | "USD">("EGP")
  const [apiKey, setApiKey] = useState("")
  const [name, setName] = useState("Ahmed Ali")
  const [phone, setPhone] = useState("+201001234567")
  const [email, setEmail] = useState("customer@example.com")
  const [amount, setAmount] = useState(150)
  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState("")

  const activeCurrency = provider === "stripe" ? currency : "EGP"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPaymentResult(null)
    setError("")

    try {
      const res = await fetch("/api/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          provider,
          amount_minor_units: Math.round(amount * 100),
          currency: activeCurrency,
          customer: {
            phone,
            email,
            full_name: name,
          },
          merchant_reference: `ord_${crypto.randomUUID().slice(0, 8)}`,
          description: "OpenWrapper Live Store Order",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Payment creation failed")
      }
      setPaymentResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment creation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1.2fr_1.8fr] gap-8 items-start">
        {/* Order Summary Card */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,55,112,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="border-b border-[#e3e8ee] dark:border-white/10 pb-4">
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase text-[#533afd] border-[#533afd]/30 bg-[#533afd]/10 rounded-full px-2.5 py-0.5"
            >
              Store Checkout
            </Badge>
            <h2 className="text-2xl font-light tracking-tight text-[#0d253d] dark:text-white mt-2">
              OpenWrapper Pro Plan
            </h2>
            <p className="text-xs text-[#64748d] dark:text-[#8ca3ba] mt-1 font-light">
              Multi-gateway routing, instant webhooks, and telemetry.
            </p>
          </div>

          <div className="flex flex-col gap-3 py-4 border-b border-[#e3e8ee] dark:border-white/10 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#64748d] dark:text-[#8ca3ba] text-xs font-mono">
                Plan Tier
              </span>
              <span className="font-mono text-xs font-medium text-[#0d253d] dark:text-white">
                Pro Monthly
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748d] dark:text-[#8ca3ba] text-xs font-mono">Amount</span>
              <div className="flex items-center gap-2">
                {provider === "stripe" ? (
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "EGP" | "USD")}
                    aria-label="Order currency"
                    className="rounded-lg border border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] px-2 py-1 font-mono text-xs font-medium text-[#0d253d] dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#533afd] cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="EGP">EGP</option>
                  </select>
                ) : (
                  <span className="font-mono text-xs text-[#64748d]">EGP</span>
                )}
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  aria-label={`Order amount in ${activeCurrency}`}
                  className="w-24 rounded-lg border border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] px-2.5 py-1 text-right font-mono font-tnum text-xs font-medium text-[#0d253d] dark:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#533afd]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-4">
            <span className="font-medium text-sm text-[#0d253d] dark:text-white">Total Due</span>
            <span className="font-mono font-tnum text-2xl font-semibold text-[#0d253d] dark:text-white">
              {activeCurrency} {amount.toFixed(2)}
            </span>
          </div>

          <div className="mt-6 rounded-xl bg-[#f6f9fc] dark:bg-[#141b33] border border-[#e3e8ee] dark:border-white/10 p-3.5 flex items-center gap-3 text-xs text-[#64748d] dark:text-[#8ca3ba]">
            <HugeiconsIcon icon={ShieldCheckIcon} size={18} className="text-emerald-500 shrink-0" />
            <span>End-to-end encrypted transaction via OpenWrapper Gateway.</span>
          </div>
        </Card>

        {/* Checkout Form */}
        <Card className="rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-white dark:bg-[#0f1426] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,55,112,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-xl font-light tracking-tight text-[#0d253d] dark:text-white">
              Choose Payment Gateway
            </CardTitle>
            <CardDescription className="text-xs text-[#64748d] dark:text-[#8ca3ba]">
              Select which provider to test via the unified OpenWrapper abstraction.
            </CardDescription>
          </CardHeader>

          {/* Provider Selectors */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-6">
            <button
              type="button"
              onClick={() => setProvider("paymob")}
              aria-pressed={provider === "paymob"}
              className={`rounded-xl border p-2 sm:p-3 flex flex-col items-center gap-1 text-center transition-all cursor-pointer min-w-0 ${
                provider === "paymob"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]"
              }`}
            >
              <HugeiconsIcon
                icon={CreditCardIcon}
                size={18}
                className={provider === "paymob" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full">Paymob</span>
              <span className="text-[9px] sm:text-[10px] font-mono opacity-80 truncate max-w-full">
                Cards / Wallets
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("fawry")}
              aria-pressed={provider === "fawry"}
              className={`rounded-xl border p-2 sm:p-3 flex flex-col items-center gap-1 text-center transition-all cursor-pointer min-w-0 ${
                provider === "fawry"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]"
              }`}
            >
              <HugeiconsIcon
                icon={Store01Icon}
                size={18}
                className={provider === "fawry" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full">Fawry</span>
              <span className="text-[9px] sm:text-[10px] font-mono opacity-80 truncate max-w-full">
                Kiosk Code
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("stripe")}
              aria-pressed={provider === "stripe"}
              className={`rounded-xl border p-2 sm:p-3 flex flex-col items-center gap-1 text-center transition-all cursor-pointer min-w-0 ${
                provider === "stripe"
                  ? "border-[#533afd] bg-[#533afd]/5 dark:bg-[#533afd]/15 text-[#533afd] font-semibold ring-1 ring-[#533afd]"
                  : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/50 dark:bg-[#141b33]/40 text-[#64748d] hover:bg-[#f6f9fc]"
              }`}
            >
              <HugeiconsIcon
                icon={Globe02Icon}
                size={18}
                className={provider === "stripe" ? "text-[#533afd]" : "text-[#8ca3ba]"}
              />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full">Stripe</span>
              <span className="text-[9px] sm:text-[10px] font-mono opacity-80 truncate max-w-full">
                Global Cards
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="checkout-api-key"
                  className="text-xs font-mono font-semibold uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
                >
                  API Key
                </label>
                <Link
                  href="/dashboard/api-keys"
                  className="text-[11px] font-mono text-[#533afd] hover:underline"
                >
                  Get API key in Dashboard ↗
                </Link>
              </div>
              <Input
                id="checkout-api-key"
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ow_live_... (or paste from Dashboard)"
                className="font-mono text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="checkout-name"
                  className="text-xs font-mono font-semibold uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
                >
                  Customer Name
                </label>
                <Input
                  id="checkout-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="checkout-phone"
                  className="text-xs font-mono font-semibold uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
                >
                  Phone (Required)
                </label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="font-mono text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="checkout-email"
                className="text-xs font-mono font-semibold uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
              >
                Email Address
              </label>
              <Input
                id="checkout-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs rounded-xl border-[#e3e8ee] dark:border-white/15 bg-[#f6f9fc] dark:bg-[#141b33] h-10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full font-medium text-sm bg-[#533afd] hover:bg-[#4434d4] active:bg-[#2e2b8c] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                  <span>Creating Intention via Gateway...</span>
                </span>
              ) : (
                <span>
                  Pay {activeCurrency} {amount.toFixed(2)} with {provider.toUpperCase()}
                </span>
              )}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-[#ea2261]" role="alert">
              {error}
            </p>
          )}

          {/* Payment Outcome Display */}
          {paymentResult && (
            <div className="mt-6 rounded-2xl border border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc] dark:bg-[#141b33] p-5 flex flex-col gap-3.5 animate-rise">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#e3e8ee] dark:border-white/10 pb-3">
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} />
                  Payment Intention Created
                </span>
                <span className="text-[11px] font-mono text-[#64748d] dark:text-[#8ca3ba] truncate max-w-[140px] sm:max-w-none">
                  {paymentResult.payment_id || paymentResult.paymentId}
                </span>
              </div>

              {/* Redirect Action for Paymob & Stripe */}
              {safeHttpUrl(paymentResult.next_action?.url) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#64748d] dark:text-[#8ca3ba]">
                    Hosted checkout session ready. Click below to pay:
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-full bg-[#533afd] hover:bg-[#4434d4] text-white font-medium text-xs"
                  >
                    <a
                      href={safeHttpUrl(paymentResult.next_action?.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5"
                    >
                      <span>Open Checkout Session</span>
                      <HugeiconsIcon icon={LinkSquare01Icon} size={13} />
                    </a>
                  </Button>
                </div>
              )}

              {/* Fawry Reference Code Display */}
              {paymentResult.next_action?.reference && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-[#64748d] dark:text-[#8ca3ba]">
                    Pay at any retail kiosk using reference code:
                  </p>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748d] block">
                      FAWRY PAYMENT REFERENCE
                    </span>
                    <span className="font-mono font-tnum text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-widest my-1 block">
                      {paymentResult.next_action.reference}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748d]">Valid for 48 hours</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
