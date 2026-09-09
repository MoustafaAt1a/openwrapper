"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Store,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SlidingCardSelector } from "@/components/ui/goo-tabs"
import { cn } from "@/lib/utils"

export interface MockCheckoutInteractivePanelProps {
  paymentId: string
  amountFormatted: string
  amountMinorUnits: number
  currency: string
  merchantReference: string
  initialStatus: string
  customerPhone: string
  customerEmail?: string
  customerName?: string
  description?: string
  createdAtFormatted?: string
  returnUrl?: string
  cancelUrl?: string
}

export type PaymentMethodTab = "card" | "fawry" | "wallet" | "mock"

function PaymentMethodCard({
  icon: Icon,
  title,
  subtitle,
  isActive,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  isActive: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 text-center w-full">
      <Icon
        className={cn(
          "size-5 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-xs font-semibold transition-colors",
          isActive ? "text-primary" : "text-foreground",
        )}
      >
        {title}
      </span>
      <span className="text-[10px] text-muted-foreground">{subtitle}</span>
    </div>
  )
}

export function MockCheckoutInteractivePanel({
  paymentId,
  amountFormatted,
  amountMinorUnits,
  currency,
  merchantReference,
  initialStatus,
  customerPhone,
  customerEmail = "customer@example.com",
  customerName = "Ahmed Ali",
  description = "Demo Order",
  returnUrl,
  cancelUrl,
}: MockCheckoutInteractivePanelProps) {
  const [method, setMethod] = useState<PaymentMethodTab>("card")
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [redirectProgress, setRedirectProgress] = useState(0)
  const [is3DSOpen, setIs3DSOpen] = useState(false)
  const [otpCode, setOtpCode] = useState("123456")

  // Customer state
  const [email, setEmail] = useState(customerEmail)
  const [name, setName] = useState(customerName)
  const [phone, setPhone] = useState(customerPhone)

  // Card fields
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242")
  const [cardExp, setCardExp] = useState("12/28")
  const [cardCvv, setCardCvv] = useState("123")

  // 9-digit Fawry reference derived deterministically
  const fawryRefCode = useMemo(() => {
    return Math.abs(
      paymentId
        .split("")
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000000, 948291041),
    )
      .toString()
      .padStart(9, "0")
  }, [paymentId])

  function handleCopyReference(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleSimulate = async (desiredStatus: "succeeded" | "failed") => {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/webhooks/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          paymentId,
          merchant_reference: merchantReference,
          merchantReference,
          status: desiredStatus,
          amount_minor_units: amountMinorUnits,
        }),
      })

      if (res.ok) {
        setStatus(desiredStatus)
        startRedirectCountdown(desiredStatus === "succeeded" ? "success" : "failed")
      } else {
        setError("Unable to complete payment. Please try again.")
        setLoading(false)
      }
    } catch {
      setError("Network error. Please check your connection.")
      setLoading(false)
    }
  }

  const startRedirectCountdown = (outcome: "success" | "failed") => {
    let current = 0
    const interval = setInterval(() => {
      current += 10
      setRedirectProgress(current)
      if (current >= 100) {
        clearInterval(interval)
        setLoading(false)
        executeRedirect(outcome)
      }
    }, 120)
  }

  const executeRedirect = (outcome: "success" | "failed") => {
    if (outcome === "success" && returnUrl) {
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set("status", "success")
      url.searchParams.set("payment_id", paymentId)
      window.location.href = url.toString()
    } else if (outcome === "failed" && (cancelUrl || returnUrl)) {
      const target = cancelUrl || returnUrl!
      const url = new URL(target, window.location.origin)
      url.searchParams.set("status", "failed")
      url.searchParams.set("payment_id", paymentId)
      window.location.href = url.toString()
    } else {
      window.location.href = "/dashboard/payments"
    }
  }

  const isTerminal = status === "succeeded" || status === "failed"

  return (
    <div className="mx-auto max-w-5xl py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-start">
        {/* Left Column: Order Summary */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-7 stripe-card-shadow-sm">
            {/* Store & Order Title */}
            <div className="border-b border-border pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">Demo Store</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                  Test Environment
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                {description}
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 font-light leading-relaxed">
                Test checkout powered by OpenWrapper.
              </p>
            </div>

            {/* Total Price */}
            <div className="py-5 border-b border-border">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-tnum">
                  {amountFormatted}
                </span>
                <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {currency}
                </span>
              </div>
            </div>

            {/* Line Items Receipt */}
            <div className="py-4 border-b border-border flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{description}</span>
                <span className="font-tnum text-foreground font-medium">{amountFormatted}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-tnum text-foreground">{amountFormatted}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="font-tnum text-foreground">0.00 {currency}</span>
              </div>
            </div>

            {/* Total Due Today */}
            <div className="pt-4 flex items-baseline justify-between">
              <span className="font-medium text-sm text-foreground">Total</span>
              <span className="font-tnum text-2xl font-semibold text-foreground">
                {amountFormatted}
              </span>
            </div>
          </div>

          {/* Clean Security Card */}
          <div className="rounded-xl bg-secondary border border-border p-4 flex items-start gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground text-xs">
                Secure & Encrypted Checkout
              </span>
              <p className="font-light leading-relaxed text-[11px]">
                Payment data is encrypted and processed directly over secure TLS rails.
              </p>
            </div>
          </div>

          {/* Reference Links */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-mono text-[11px] truncate max-w-[220px]" title={paymentId}>
              Order ID: {paymentId.slice(0, 16)}...
            </span>
            {returnUrl ? (
              <a
                href={returnUrl}
                className="hover:text-foreground transition-colors flex items-center gap-1 text-xs"
              >
                <span>Back to store</span>
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <Link href="/dashboard/payments" className="hover:text-foreground transition-colors">
                View in dashboard →
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Payment Details */}
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-8 stripe-card-shadow-md transition-depth hover:stripe-card-shadow-hover">
          {/* Header */}
          <div className="pb-5 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-light tracking-tight text-foreground">Payment details</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                  status === "succeeded" &&
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                  status === "failed" &&
                    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                  status === "pending" &&
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "succeeded" && "bg-emerald-500",
                    status === "failed" && "bg-rose-500",
                    status === "pending" && "bg-amber-500 animate-pulse",
                  )}
                />
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-light">
              Choose your payment method below.
            </p>
          </div>

          {/* Payment Method Selector */}
          <SlidingCardSelector
            items={[
              {
                id: "card",
                content: (
                  <PaymentMethodCard
                    icon={CreditCard}
                    title="Card"
                    subtitle="Visa / Mastercard"
                    isActive={method === "card"}
                  />
                ),
              },
              {
                id: "fawry",
                content: (
                  <PaymentMethodCard
                    icon={Store}
                    title="Fawry"
                    subtitle="Pay at Kiosk"
                    isActive={method === "fawry"}
                  />
                ),
              },
              {
                id: "wallet",
                content: (
                  <PaymentMethodCard
                    icon={Smartphone}
                    title="Wallets"
                    subtitle="Mobile Wallet"
                    isActive={method === "wallet"}
                  />
                ),
              },
              {
                id: "mock",
                content: (
                  <PaymentMethodCard
                    icon={Zap}
                    title="Sandbox"
                    subtitle="Instant Test"
                    isActive={method === "mock"}
                  />
                ),
              },
            ]}
            activeId={method}
            onSelect={(id) => {
              setMethod(id as PaymentMethodTab)
              setError("")
            }}
            className="grid-cols-2 sm:grid-cols-4 gap-2 my-5"
          />

          {/* Clean Test Scenarios */}
          <div className="mb-5 rounded-lg bg-secondary p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">
                Test options
              </span>
              <span className="text-[11px] text-muted-foreground">Sandbox triggers</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSimulate("succeeded")}
                disabled={loading || status === "succeeded"}
                className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Simulate Success</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulate("failed")}
                disabled={loading || isTerminal}
                className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="size-1.5 rounded-full bg-rose-500" />
                <span>Simulate Decline</span>
              </button>
              <button
                type="button"
                onClick={() => setIs3DSOpen(true)}
                disabled={loading || isTerminal}
                className="flex items-center justify-center gap-1.5 rounded-md bg-card hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-border py-1.5 px-2 text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>Simulate 3DS</span>
              </button>
            </div>
          </div>

          {/* Payment Form Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-email" className="text-xs font-medium text-foreground">
                Email
              </label>
              <Input
                id="checkout-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="text-sm rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-name" className="text-xs font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="checkout-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="text-sm rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-phone" className="text-xs font-medium text-foreground">
                  Phone
                </label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 123 4567"
                  className="text-sm font-tnum rounded-lg border-border bg-card text-foreground h-10 stripe-card-shadow-xs"
                />
              </div>
            </div>

            {/* Method Details */}
            {method === "card" && (
              <div className="flex flex-col gap-3 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Card details</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setCardNumber("4242424242424242")}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Visa
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setCardNumber("5123450000000008")}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Mastercard
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setCardNumber("5078030000000001")}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      Meeza
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="text-sm font-mono rounded-lg border-border bg-card text-foreground h-10 pr-10"
                  />
                  <CreditCard className="size-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="text"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    placeholder="MM / YY"
                    className="text-sm font-mono text-center rounded-lg border-border bg-card text-foreground h-10"
                  />
                  <Input
                    type="text"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="CVC"
                    maxLength={4}
                    className="text-sm font-mono text-center rounded-lg border-border bg-card text-foreground h-10"
                  />
                </div>
              </div>
            )}

            {method === "fawry" && (
              <div className="rounded-lg bg-secondary/80 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                <Store className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  You will receive a reference code to pay in cash at any Fawry kiosk or retail store.
                </p>
              </div>
            )}

            {method === "wallet" && (
              <div className="rounded-lg bg-secondary/80 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                <Smartphone className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  A payment request will be sent to your mobile wallet ({phone}).
                </p>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="button"
              onClick={() => handleSimulate("succeeded")}
              disabled={loading || status === "succeeded"}
              className="w-full h-12 rounded-full font-medium text-sm bg-primary hover:bg-primary-deep text-primary-foreground shadow-md hover:shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2 btn-spring active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Pay {amountFormatted}</span>
                </span>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Outcome Card */}
          {(status === "succeeded" || status === "failed" || method === "fawry") && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 stripe-card-shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span
                  className={cn(
                    "text-xs font-semibold flex items-center gap-1.5",
                    status === "succeeded"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : status === "failed"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground",
                  )}
                >
                  {status === "succeeded" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : status === "failed" ? (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Store className="w-4 h-4 text-primary" />
                  )}
                  {status === "succeeded"
                    ? "Payment Successful"
                    : status === "failed"
                      ? "Payment Declined"
                      : "Fawry Reference Code Ready"}
                </span>
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                  {paymentId.slice(0, 16)}
                </span>
              </div>

              {/* Fawry POS Voucher */}
              {method === "fawry" && (
                <div className="rounded-xl border border-emerald-500/30 bg-card p-4 flex flex-col gap-3">
                  <div className="text-center py-1">
                    <span className="text-xs text-muted-foreground block">Reference Number</span>
                    <span className="text-3xl font-mono font-bold tracking-widest text-foreground my-1 block">
                      {fawryRefCode}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      pill
                      onClick={() => handleCopyReference(fawryRefCode)}
                      className="mt-1.5 text-xs gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Pay with this code at any Fawry retail point within 48 hours.
                  </p>
                </div>
              )}

              {/* Redirect Indicator */}
              {redirectProgress > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Redirecting back...</span>
                    <span>{Math.ceil((100 - redirectProgress) / 80)}s</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-100 ease-linear",
                        status === "succeeded" ? "bg-emerald-500" : "bg-rose-500",
                      )}
                      style={{ width: `${redirectProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                {returnUrl ? (
                  <Button asChild variant="ghost" size="sm" className="text-xs">
                    <a href={returnUrl}>← Return to store</a>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatus("pending")}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Reset
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" pill className="text-xs">
                  <Link href="/dashboard/payments">View Ledger ↗</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3DS Verification Modal */}
      {is3DSOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card text-foreground border border-border rounded-2xl p-6 sm:p-7 max-w-sm w-full stripe-card-shadow-md space-y-4 relative">
            <button
              type="button"
              onClick={() => setIs3DSOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <h3 className="font-medium text-sm text-foreground">Card Verification</h3>
                <p className="text-xs text-muted-foreground">3D Secure</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Enter the verification code sent to your mobile phone.
            </p>

            <div className="space-y-2">
              <label htmlFor="otp-input" className="block text-xs font-medium text-foreground">
                Verification Code
              </label>
              <input
                id="otp-input"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground block text-center">
                Demo code: <strong className="font-mono text-primary">123456</strong>
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIs3DSOpen(false)
                  handleSimulate("succeeded")
                }}
                disabled={loading}
                className="w-full h-10 rounded-full font-medium text-xs bg-primary hover:bg-primary-deep text-primary-foreground shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="size-4" />
                <span>Confirm & Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setIs3DSOpen(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
