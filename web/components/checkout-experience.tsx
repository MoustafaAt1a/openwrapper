"use client"

import { useState } from "react"
import { safeHttpUrl } from "@/lib/utils"
import Link from "next/link"
import { Check, Copy, CreditCard, ExternalLink, Loader2, Play, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  const [apiKey, setApiKey] = useState("")
  const [name, setName] = useState("Ahmed Ali")
  const [phone, setPhone] = useState("+201001234567")
  const [email, setEmail] = useState("customer@example.com")
  const [amount, setAmount] = useState(150)
  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [error, setError] = useState("")

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
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Idempotency-Key": `demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        },
        body: JSON.stringify({
          provider,
          amount_minor_units: amount * 100,
          currency: "EGP",
          customer: {
            phone,
            email,
            full_name: name,
          },
          merchant_reference: `demo_${Date.now().toString().slice(-6)}`,
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
        {/* Order Summary */}
        <Card className="border border-border/80 bg-card p-6 shadow-2xs">
          <div className="border-b border-border/80 pb-4">
            <Badge variant="outline" className="font-mono text-[10px] uppercase text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              Demo Checkout
            </Badge>
            <h2 className="text-xl font-bold text-foreground mt-2">OpenWrapper Pro Plan</h2>
            <p className="text-xs text-muted-foreground mt-1">Multi-gateway routing, instant webhooks, and telemetry.</p>
          </div>

          <div className="flex flex-col gap-3 py-4 border-b border-border/80 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-mono">Plan Tier</span>
              <span className="font-mono text-xs font-medium text-foreground">Pro Monthly</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-mono">Amount</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-muted-foreground">EGP</span>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  aria-label="Order amount in EGP"
                  className="w-20 rounded border border-border/80 bg-muted/40 px-2 py-0.5 text-right font-mono text-xs font-bold text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-4">
            <span className="font-semibold text-sm text-foreground">Total Due</span>
            <span className="font-mono text-2xl font-bold text-foreground">EGP {amount.toFixed(2)}</span>
          </div>

          <div className="mt-6 rounded-xl bg-muted/30 border border-border/80 p-3.5 flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
            <span>End-to-end encrypted transaction via OpenWrapper Gateway.</span>
          </div>
        </Card>

        {/* Checkout Form */}
        <Card className="border border-border/80 bg-card p-6 sm:p-8 shadow-2xs">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-xl font-bold text-foreground">Choose Payment Gateway</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Select which provider to test via the unified OpenWrapper abstraction.
            </CardDescription>
          </CardHeader>

          {/* Provider Selectors */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setProvider("paymob")}
              aria-pressed={provider === "paymob"}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                provider === "paymob"
                  ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                  : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-xs font-bold">Paymob</span>
              <span className="text-[10px] font-mono opacity-70">Cards / Wallets</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("fawry")}
              aria-pressed={provider === "fawry"}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                provider === "fawry"
                  ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                  : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-xs font-bold">Fawry</span>
              <span className="text-[10px] font-mono opacity-70">Kiosk Code</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("stripe")}
              aria-pressed={provider === "stripe"}
              className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                provider === "stripe"
                  ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                  : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <span className="text-xs font-bold">Stripe</span>
              <span className="text-[10px] font-mono opacity-70">Global Cards</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-api-key" className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                API Key
              </label>
              <Input
                id="checkout-api-key"
                type="password"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ow_live_..."
                className="font-mono text-xs bg-muted/30"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-name" className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer Name
                </label>
                <Input
                  id="checkout-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs bg-muted/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-phone" className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone (Required)
                </label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="font-mono text-xs bg-muted/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-email" className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                id="checkout-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs bg-muted/30"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full font-mono text-xs font-bold shadow-xs mt-2">
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Creating Intention via Gateway...
                </>
              ) : (
                <>Pay EGP {amount.toFixed(2)} with {provider.toUpperCase()}</>
              )}
            </Button>
          </form>

          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}

          {/* Payment Outcome Display */}
          {paymentResult && (
            <div className="mt-6 rounded-xl border border-border/80 bg-muted/20 p-5 flex flex-col gap-3.5 animate-rise">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <span className="font-mono text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Payment Intention Created
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {paymentResult.payment_id || paymentResult.paymentId}
                </span>
              </div>

              {/* Redirect Action for Paymob & Stripe */}
              {safeHttpUrl(paymentResult.next_action?.url) && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">Hosted checkout session ready. Click below to pay:</p>
                  <Button asChild size="sm" className="w-full font-mono text-xs">
                    <a href={safeHttpUrl(paymentResult.next_action?.url)} target="_blank" rel="noopener noreferrer">
                      Open Checkout Session <ExternalLink className="size-3 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Fawry Reference Code Display */}
              {paymentResult.next_action?.reference && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">Pay at any retail kiosk using reference code:</p>
                  <div className="rounded-lg border border-emerald-500/30 bg-black/40 p-4 text-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                      FAWRY PAYMENT REFERENCE
                    </span>
                    <span className="font-mono text-3xl font-bold text-emerald-400 tracking-widest my-1 block">
                      {paymentResult.next_action.reference}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Valid for 48 hours</span>
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
