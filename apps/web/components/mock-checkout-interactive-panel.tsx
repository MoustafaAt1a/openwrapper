"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  X,
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

export type PaymentMethodTab = "card" | "fawry" | "wallet"

const TEST_CARDS = [
  { label: "Visa", number: "4242 4242 4242 4242", exp: "12/28", cvc: "123", is3ds: false, isDecline: false },
  { label: "3DS Auth", number: "5123 4500 0000 0008", exp: "12/28", cvc: "123", is3ds: true, isDecline: false },
  { label: "Meeza", number: "5078 0300 0000 0001", exp: "12/28", cvc: "123", is3ds: false, isDecline: false },
  { label: "Decline", number: "4000 0000 0000 0002", exp: "12/28", cvc: "123", is3ds: false, isDecline: true },
]

function getCardBrand(num: string) {
  const clean = num.replace(/\s+/g, "")
  if (clean.startsWith("5078")) return { name: "Meeza", badge: "Meeza" }
  if (clean.startsWith("4")) return { name: "Visa", badge: "Visa" }
  if (/^5[1-5]/.test(clean)) return { name: "Mastercard", badge: "Mastercard" }
  return { name: "Card", badge: null }
}

function getWalletCarrier(p: string) {
  const clean = p.replace(/[\s+-]/g, "")
  if (clean.includes("10") || clean.endsWith("010")) return "Vodafone Cash"
  if (clean.includes("11") || clean.endsWith("011")) return "Etisalat Cash"
  if (clean.includes("12") || clean.endsWith("012")) return "Orange Money"
  if (clean.includes("15") || clean.endsWith("015")) return "WE Pay"
  return "Mobile Wallet"
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
  description = "Order Payment",
  returnUrl,
  cancelUrl,
}: MockCheckoutInteractivePanelProps) {
  const [method, setMethod] = useState<PaymentMethodTab>("card")
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [is3DSOpen, setIs3DSOpen] = useState(false)
  const [is3DSConfirmed, setIs3DSConfirmed] = useState(false)
  const [otpCode, setOtpCode] = useState("123456")

  // Customer contact details
  const [email, setEmail] = useState(customerEmail)
  const [name, setName] = useState(customerName)
  const [phone, setPhone] = useState(customerPhone)

  // Card details (pre-filled with standard test card)
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242")
  const [cardExp, setCardExp] = useState("12/28")
  const [cardCvv, setCardCvv] = useState("123")

  const cardBrand = useMemo(() => getCardBrand(cardNumber), [cardNumber])
  const walletCarrier = useMemo(() => getWalletCarrier(phone), [phone])

  // Deterministic 9-digit Fawry kiosk code
  const fawryRefCode = useMemo(() => {
    return Math.abs(
      paymentId
        .split("")
        .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000000, 948291041),
    )
      .toString()
      .padStart(9, "0")
  }, [paymentId])

  function handleCopyReference(code: string, key: string) {
    navigator.clipboard.writeText(code)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handlePayment = async (forceOutcome?: "succeeded" | "failed") => {
    setError("")

    const cleanCard = cardNumber.replace(/\s+/g, "")
    const isDeclineCard = cleanCard.endsWith("0002") || forceOutcome === "failed"
    const is3DSCard = cleanCard.endsWith("0008")

    // Trigger 3DS modal if required
    if (method === "card" && is3DSCard && !is3DSConfirmed && !forceOutcome) {
      setIs3DSOpen(true)
      return
    }

    setLoading(true)
    const desiredStatus = isDeclineCard ? "failed" : "succeeded"

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)

      const res = await fetch("/api/webhooks/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          payment_id: paymentId,
          paymentId,
          merchant_reference: merchantReference,
          merchantReference,
          status: desiredStatus,
          amount_minor_units: amountMinorUnits,
        }),
      })
      clearTimeout(timeoutId)

      if (desiredStatus === "failed") {
        setStatus("failed")
        setError("Card was declined by the issuing bank. Try testing with the Visa (4242) or Meeza (5078) card.")
        setLoading(false)
        return
      }

      if (res.ok) {
        setStatus("succeeded")
        setLoading(false)
      } else {
        setError("Payment processing encountered an error. Please try again.")
        setLoading(false)
      }
    } catch {
      // Instant graceful fallback for offline or interrupted local dev
      if (desiredStatus === "failed") {
        setStatus("failed")
        setError("Card was declined by issuing bank.")
      } else {
        setStatus("succeeded")
      }
      setLoading(false)
    }
  }

  const methodTabs = [
    {
      id: "card",
      content: (
        <div className="flex flex-col items-center gap-1.5 p-3 text-center w-full">
          <CreditCard
            className={cn(
              "size-5 transition-colors",
              method === "card" ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold transition-colors",
              method === "card" ? "text-primary" : "text-foreground",
            )}
          >
            Card
          </span>
          <span className="text-[10px] text-muted-foreground">Visa, Mastercard, Meeza</span>
        </div>
      ),
    },
    {
      id: "fawry",
      content: (
        <div className="flex flex-col items-center gap-1.5 p-3 text-center w-full">
          <Store
            className={cn(
              "size-5 transition-colors",
              method === "fawry" ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold transition-colors",
              method === "fawry" ? "text-primary" : "text-foreground",
            )}
          >
            Fawry
          </span>
          <span className="text-[10px] text-muted-foreground">Pay at kiosk</span>
        </div>
      ),
    },
    {
      id: "wallet",
      content: (
        <div className="flex flex-col items-center gap-1.5 p-3 text-center w-full">
          <Smartphone
            className={cn(
              "size-5 transition-colors",
              method === "wallet" ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold transition-colors",
              method === "wallet" ? "text-primary" : "text-foreground",
            )}
          >
            Mobile Wallet
          </span>
          <span className="text-[10px] text-muted-foreground">Vodafone, Orange, WE</span>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid lg:grid-cols-[1fr_1.25fr] gap-8 lg:gap-12 items-start">
        {/* Left Column: Order Summary */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-7 stripe-card-shadow-sm">
            {/* Header */}
            <div className="border-b border-border pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">OpenWrapper Checkout</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs font-mono text-muted-foreground">{currency}</span>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-foreground">
                {description}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-light">
                Reference: <span className="font-mono text-foreground">{merchantReference}</span>
              </p>
            </div>

            {/* Total Display */}
            <div className="py-5 border-b border-border">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl sm:text-4xl font-light tracking-tight text-foreground font-tnum">
                  {amountFormatted}
                </span>
                <span className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {currency}
                </span>
              </div>
            </div>

            {/* Line Items */}
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

            {/* Total Due */}
            <div className="pt-4 flex items-baseline justify-between">
              <span className="font-medium text-sm text-foreground">Total due</span>
              <span className="font-tnum text-2xl font-semibold text-foreground">
                {amountFormatted}
              </span>
            </div>
          </div>

          {/* Clean Security Badge */}
          <div className="rounded-xl bg-secondary/70 border border-border p-4 flex items-start gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground text-xs">
                Encrypted payment rails
              </span>
              <p className="font-light leading-relaxed text-[11px]">
                Transactions are authorized via provider-neutral TLS connections with zero raw card persistence.
              </p>
            </div>
          </div>

          {/* Navigation link */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-mono text-[11px] truncate max-w-[200px]" title={paymentId}>
              ID: {paymentId.slice(0, 16)}...
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

        {/* Right Column: Checkout Form OR Instant Receipt */}
        {status === "succeeded" ? (
          /* Instant In-Place Receipt */
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-8 stripe-card-shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center pb-6 border-b border-border">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-3.5">
                <Check className="size-6 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-light tracking-tight text-foreground">Payment complete</h2>
              <p className="text-xs text-muted-foreground mt-1 font-light">
                Your transaction has been authorized and settled.
              </p>
              <div className="mt-4 text-3xl font-light tracking-tight text-foreground font-tnum">
                {amountFormatted}
              </div>
            </div>

            {/* Receipt Summary Table */}
            <div className="py-5 space-y-3.5 text-xs border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                  <span className="truncate max-w-[200px]">{paymentId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(paymentId, "id")}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy Payment ID"
                  >
                    {copiedKey === "id" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Merchant Reference</span>
                <span className="font-mono text-[11px] text-foreground">{merchantReference}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="text-foreground font-medium">
                  {method === "card"
                    ? `${cardBrand.name} ending in ${cardNumber.replace(/\s+/g, "").slice(-4) || "4242"}`
                    : method === "fawry"
                      ? `Fawry Kiosk (${fawryRefCode})`
                      : `Mobile Wallet (${phone})`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Succeeded
                </span>
              </div>
            </div>

            {/* Fawry Voucher Card if Fawry was chosen */}
            {method === "fawry" && (
              <div className="my-5 rounded-xl border border-border bg-secondary/50 p-4 text-center">
                <span className="text-xs text-muted-foreground block">Fawry Kiosk Reference</span>
                <span className="text-2xl font-mono font-bold tracking-widest text-foreground my-1.5 block">
                  {fawryRefCode}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Pay at any retail kiosk within 48 hours using this reference.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 flex flex-col gap-3">
              {returnUrl ? (
                <Button asChild size="lg" className="w-full rounded-full gap-2 text-sm font-medium">
                  <a href={returnUrl}>
                    Return to merchant
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  pill
                  onClick={() => {
                    setStatus("pending")
                    setIs3DSConfirmed(false)
                    setError("")
                  }}
                  className="text-xs cursor-pointer gap-1.5"
                >
                  <RefreshCw className="size-3" />
                  Make another payment
                </Button>

                <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  <Link href="/dashboard/payments">View in ledger →</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Selection & Input Form */
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-6 sm:p-8 stripe-card-shadow-md">
            {/* Form Header */}
            <div className="pb-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-light tracking-tight text-foreground">Select payment method</h2>
                <p className="text-xs text-muted-foreground mt-1 font-light">
                  Choose your preferred payment rail to continue.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </span>
            </div>

            {/* Payment Method Selector */}
            <SlidingCardSelector
              items={methodTabs}
              activeId={method}
              onSelect={(id) => {
                setMethod(id as PaymentMethodTab)
                setError("")
              }}
              className="grid-cols-3 gap-2 my-6"
            />

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              {/* Contact Information */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="customer-name" className="text-xs font-medium text-foreground">
                    Name
                  </label>
                  <Input
                    id="customer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="text-sm rounded-lg border-border bg-card text-foreground h-10"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="customer-email" className="text-xs font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="text-sm rounded-lg border-border bg-card text-foreground h-10"
                  />
                </div>
              </div>

              {/* Method-Specific Fields */}
              {method === "card" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  {/* Card Number with discreet test presets */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Card number</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="text-[10px] text-muted-foreground/80">Test cards:</span>
                        {TEST_CARDS.map((tc, idx) => (
                          <span key={tc.label} className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCardNumber(tc.number)
                                setCardExp(tc.exp)
                                setCardCvv(tc.cvc)
                                setError("")
                              }}
                              className={cn(
                                "hover:underline cursor-pointer font-medium transition-colors",
                                tc.isDecline
                                  ? "text-rose-500 hover:text-rose-600"
                                  : "text-primary hover:text-primary-deep",
                              )}
                            >
                              {tc.label}
                            </button>
                            {idx < TEST_CARDS.length - 1 && (
                              <span className="text-muted-foreground/30">•</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          setCardNumber(e.target.value)
                          setError("")
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="text-sm font-mono rounded-lg border-border bg-card text-foreground h-10 pr-20"
                      />
                      <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none">
                        {cardBrand.badge ? (
                          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                            {cardBrand.badge}
                          </span>
                        ) : (
                          <CreditCard className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expiry and CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="card-expiry" className="text-xs font-medium text-foreground">
                        Expiration
                      </label>
                      <Input
                        id="card-expiry"
                        type="text"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        placeholder="MM / YY"
                        maxLength={7}
                        className="text-sm font-mono text-center rounded-lg border-border bg-card text-foreground h-10"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="card-cvc" className="text-xs font-medium text-foreground">
                        CVC
                      </label>
                      <Input
                        id="card-cvc"
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="text-sm font-mono text-center rounded-lg border-border bg-card text-foreground h-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === "fawry" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Kiosk Reference Code</span>
                      <span className="text-[10px] text-muted-foreground">Generated code</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3">
                      <span className="text-2xl font-mono font-bold tracking-widest text-foreground">
                        {fawryRefCode}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        pill
                        onClick={() => handleCopyReference(fawryRefCode, "fawry")}
                        className="text-xs gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedKey === "fawry" ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                      Pay with this code at any Fawry retail point or kiosk within 48 hours.
                    </p>
                  </div>
                </div>
              )}

              {method === "wallet" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="wallet-phone" className="text-xs font-medium text-foreground">
                        Mobile Wallet Number
                      </label>
                      <span className="text-[11px] text-primary font-medium">{walletCarrier}</span>
                    </div>
                    <Input
                      id="wallet-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+20 100 123 4567"
                      className="text-sm font-tnum rounded-lg border-border bg-card text-foreground h-10"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    An authorization request will be sent directly to your registered mobile wallet.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive animate-in fade-in duration-150">
                  {error}
                </div>
              )}

              {/* Submit Pay Button */}
              <button
                type="button"
                onClick={() => handlePayment()}
                disabled={loading}
                className="w-full h-12 rounded-full font-medium text-sm bg-primary hover:bg-primary-deep text-primary-foreground shadow-md hover:shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2 btn-spring active:scale-[0.99]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Authorizing transaction...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="size-4" />
                    <span>
                      {method === "card"
                        ? `Pay ${amountFormatted}`
                        : method === "fawry"
                          ? `Confirm Fawry Order (${amountFormatted})`
                          : `Authorize ${amountFormatted}`}
                    </span>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3DS Verification Modal */}
      {is3DSOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card text-foreground border border-border rounded-2xl p-6 sm:p-7 max-w-sm w-full stripe-card-shadow-md space-y-4 relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIs3DSOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">3D Secure Authorization</h3>
                <p className="text-xs text-muted-foreground">Issuing Bank Verification</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Enter the 6-digit one-time passcode sent to your phone ending in{" "}
              <strong className="font-mono text-foreground font-medium">
                {phone.slice(-4) || "4567"}
              </strong>{" "}
              to authorize {amountFormatted}.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="mock-otp-input" className="block text-xs font-medium text-foreground">
                Verification Code
              </label>
              <input
                id="mock-otp-input"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="w-full text-center tracking-[0.35em] font-mono text-xl font-bold py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground block text-center">
                Test code: <strong className="font-mono text-primary">123456</strong>
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => {
                  setIs3DSOpen(false)
                  setIs3DSConfirmed(true)
                  handlePayment("succeeded")
                }}
                disabled={loading}
                className="w-full rounded-full text-xs font-medium h-10 gap-1.5 cursor-pointer"
              >
                <Check className="size-4" />
                Authorize Payment
              </Button>
              <button
                type="button"
                onClick={() => setIs3DSOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground py-1 text-center cursor-pointer"
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
