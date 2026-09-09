"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Key,
  Layers,
  Loader2,
  Lock,
  QrCode,
  RotateCcw,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface TestCardOption {
  id: string
  label: string
  rail: string
  pan: string
  displayPan: string
  exp: string
  cvv: string
  holder: string
  logo: string
  logoWidth: number
  logoHeight: number
  gradient: string
  accentColor: string
}

const TEST_CARDS: TestCardOption[] = [
  {
    id: "stripe_intl",
    label: "Stripe International",
    rail: "Visa International",
    pan: "4242424242424242",
    displayPan: "4242 •••• •••• 4242",
    exp: "12/28",
    cvv: "123",
    holder: "ALEXANDER R. VANCE",
    logo: "/assets/visa.png",
    logoWidth: 54,
    logoHeight: 26,
    gradient: "from-[#1e1b4b] via-[#3730a3] to-[#2563eb]",
    accentColor: "border-indigo-500/40 text-indigo-400",
  },
  {
    id: "paymob_3ds",
    label: "Paymob 3DS Test",
    rail: "Mastercard 3DS 2.0",
    pan: "5123450000000008",
    displayPan: "5123 •••• •••• 0008",
    exp: "12/28",
    cvv: "123",
    holder: "MAHMOUD EL-SAYED",
    logo: "/assets/card.png",
    logoWidth: 44,
    logoHeight: 26,
    gradient: "from-[#082f49] via-[#0284c7] to-[#1d4ed8]",
    accentColor: "border-sky-500/40 text-sky-400",
  },
  {
    id: "meeza_egypt",
    label: "Meeza Local Debit",
    rail: "Egyptian Meeza Rail",
    pan: "5078030000000001",
    displayPan: "5078 •••• •••• 0001",
    exp: "12/28",
    cvv: "123",
    holder: "FATIMA ALI NOOR",
    logo: "/assets/meeza.png",
    logoWidth: 52,
    logoHeight: 26,
    gradient: "from-[#022c22] via-[#059669] to-[#0f766e]",
    accentColor: "border-emerald-500/40 text-emerald-400",
  },
]

export function MockCheckoutInteractivePanel({
  paymentId,
  amountFormatted,
  amountMinorUnits,
  currency,
  merchantReference,
  initialStatus,
  customerPhone,
  customerEmail = "developer@openwrapper.internal",
  customerName = "Ahmed M. Hassan",
  description = "OpenWrapper API Platform Gateway Tier & Rail Settlement",
  createdAtFormatted = new Date().toLocaleString(),
  returnUrl,
  cancelUrl,
}: MockCheckoutInteractivePanelProps) {
  const [status, setStatus] = useState(initialStatus)
  const [activeTab, setActiveTab] = useState<"card" | "fawry" | "telemetry">("card")
  const [selectedCard, setSelectedCard] = useState<TestCardOption>(TEST_CARDS[0]!)
  const [cardHolder, setCardHolder] = useState(TEST_CARDS[0]!.holder)
  const [cardNumber, setCardNumber] = useState(TEST_CARDS[0]!.displayPan)
  const [cardExp, setCardExp] = useState(TEST_CARDS[0]!.exp)
  const [cardCvv, setCardCvv] = useState(TEST_CARDS[0]!.cvv)

  const [loading, setLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [redirectProgress, setRedirectProgress] = useState(0)
  const [is3DSOpen, setIs3DSOpen] = useState(false)
  const [otpCode, setOtpCode] = useState("123456")

  // Fawry 9-digit Reference Code derived from payment ULID
  const fawryRefCode = Math.abs(
    paymentId.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000000, 948291041),
  ).toString().padStart(9, "0")

  // Copy helper
  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // fallback
    }
  }

  // Switch card and sync inputs
  const handleSelectCard = (card: TestCardOption) => {
    setSelectedCard(card)
    setCardHolder(card.holder)
    setCardNumber(card.displayPan)
    setCardExp(card.exp)
    setCardCvv(card.cvv)
  }

  // Simulation handler
  const handleSimulate = async (desiredStatus: "succeeded" | "failed", customMessage?: string) => {
    setLoading(true)
    setActionMessage(
      customMessage ||
        (desiredStatus === "succeeded"
          ? "Contacting OpenWrapper gateway & settling transaction..."
          : "Simulating card issuer decline (402)..."),
    )

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
        if (desiredStatus === "succeeded") {
          setActionMessage("Payment Succeeded & Verified! Redirecting to merchant...")
          startRedirectCountdown("success")
        } else {
          setActionMessage("Simulated decline recorded (Card Declined). Returning to merchant...")
          startRedirectCountdown("failed")
        }
      } else {
        setActionMessage("Settlement request failed. Please check gateway connectivity.")
        setLoading(false)
      }
    } catch {
      setActionMessage("Network error during simulation request.")
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
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      {/* 1. Sub-Header Navigation & Live State Ribbon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          {returnUrl ? (
            <a
              href={returnUrl}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Return to Checkout Store</span>
            </a>
          ) : (
            <Link
              href="/dashboard/payments"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Payment Console</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-card/80 border border-border shadow-2xs">
            <span
              className={cn(
                "size-2 rounded-full",
                status === "succeeded" && "bg-emerald-500",
                status === "failed" && "bg-rose-500",
                status === "pending" && "bg-amber-500 animate-pulse",
              )}
            />
            <span className="text-foreground uppercase tracking-wider text-[11px] font-mono">
              SANDBOX SIMULATOR · {status}
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground px-2.5 py-1 rounded-full border border-border/60 bg-muted/40">
            <Lock className="size-3 text-primary" />
            <span>TLS 1.3 · Zero-Knowledge</span>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Split Checkout Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Merchant Context & Technical Ledger (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Merchant Identity & Large Amount */}
          <div className="rounded-3xl border border-border bg-card/85 backdrop-blur-xl p-6 sm:p-7 shadow-lg shadow-black/5 dark:shadow-black/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
                <Store className="size-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">OpenWrapper Store</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                </div>
                <span className="text-xs text-muted-foreground">Verified Merchant Rails</span>
              </div>
            </div>

            <div className="space-y-1 mb-5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Total Due Today
              </span>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-foreground tracking-tight">
                {amountFormatted}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {amountMinorUnits.toLocaleString()} minor units · Currency {currency}
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-3 pt-4 border-t border-border/60 text-xs font-mono">
              <div className="flex justify-between items-start gap-2">
                <span className="text-muted-foreground">{description}</span>
                <span className="font-semibold text-foreground shrink-0">{amountFormatted}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Estimated Processing (Sandbox)</span>
                <span className="text-emerald-500 font-semibold">0.00 {currency}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Tax (0.00%)</span>
                <span>0.00 {currency}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50 text-sm font-bold text-foreground">
                <span>Total</span>
                <span>{amountFormatted}</span>
              </div>
            </div>
          </div>

          {/* Technical Transaction Ledger */}
          <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Terminal className="size-3 text-primary" />
                Technical Session Ledger
              </span>
              <span className="text-[10px] text-muted-foreground">{createdAtFormatted}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Payment ID:</span>
              <button
                type="button"
                onClick={() => handleCopy(paymentId, "id")}
                className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 select-all truncate max-w-[200px]"
                title="Copy payment ID"
              >
                <span>{paymentId}</span>
                {copiedKey === "id" ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Merchant Ref:</span>
              <button
                type="button"
                onClick={() => handleCopy(merchantReference, "ref")}
                className="text-foreground hover:text-primary transition-colors flex items-center gap-1 select-all"
                title="Copy merchant reference"
              >
                <span>{merchantReference}</span>
                {copiedKey === "ref" ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Customer Phone:</span>
              <span className="text-foreground">{customerPhone}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Customer Email:</span>
              <span className="text-foreground truncate max-w-[180px]">{customerEmail}</span>
            </div>
          </div>

          {/* Architecture Guarantees */}
          <div className="rounded-2xl border border-border/70 bg-secondary/50 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Enterprise Gateway Guarantees</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Monetary math strictly executes in discrete integer minor units (Invariant I1).
              Zero secrets are persisted on local storage (Invariant I3). Fully compliant with PCI
              SAQ-A hosted checkout standards.
            </p>
          </div>
        </div>

        {/* Right Column: Payment Terminal & Simulator Engine (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-border/80 bg-card/95 dark:bg-[#0c101d]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/10 dark:shadow-black/50 relative overflow-hidden">
            {/* Top signature gradient line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-sky-500 to-emerald-500" />

            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="size-3" />
                    Interactive Simulator Terminal
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Select Simulation Rail
                </h2>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "card"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CreditCard className="size-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fawry")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "fawry"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Store className="size-3.5" />
                  <span>Fawry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("telemetry")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "telemetry"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Layers className="size-3.5" />
                  <span>Wire JSON</span>
                </button>
              </div>
            </div>

            {/* TAB 1: CARD SIMULATOR */}
            {activeTab === "card" && (
              <div className="space-y-6">
                {/* Test Card Rail Switcher */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Simulated Regional Rail Vector:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {TEST_CARDS.map((card) => {
                      const isSelected = card.id === selectedCard.id
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => handleSelectCard(card)}
                          className={cn(
                            "p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between min-h-[64px]",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-[11px] text-foreground truncate">
                              {card.label}
                            </span>
                            {isSelected && (
                              <span className="size-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {card.rail}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Photorealistic Credit Card Preview */}
                <div
                  className={cn(
                    "bg-gradient-to-tr text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-black/25 relative overflow-hidden transition-all duration-300 border border-white/10",
                    selectedCard.gradient,
                  )}
                >
                  {/* Specular sheen effect */}
                  <div className="absolute -top-24 -right-24 size-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

                  {/* Card Top Row: Chip, Contactless, Logo */}
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      {/* Metallic Gold EMV Chip Graphic */}
                      <div className="size-10 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-1 shadow-inner border border-amber-300/60 relative overflow-hidden">
                        <div className="w-full h-full border border-amber-700/30 rounded-md grid grid-cols-2 grid-rows-2 gap-0.5">
                          <div className="border-r border-b border-amber-800/40" />
                          <div className="border-b border-amber-800/40" />
                          <div className="border-r border-amber-800/40" />
                          <div />
                        </div>
                      </div>

                      {/* Contactless Wave Icon */}
                      <div className="opacity-80">
                        <svg
                          className="size-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M8.5 14.5A4 4 0 0 1 8.5 9.5" />
                          <path d="M11.5 17.5A8 8 0 0 0 11.5 6.5" />
                          <path d="M14.5 20.5A12 12 0 0 0 14.5 3.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Partner High-Res Badge */}
                    <div className="h-8 flex items-center justify-end">
                      <Image
                        src={selectedCard.logo}
                        alt={selectedCard.rail}
                        width={selectedCard.logoWidth}
                        height={selectedCard.logoHeight}
                        className="object-contain drop-shadow"
                      />
                    </div>
                  </div>

                  {/* Card Number Display with 1-click copy */}
                  <div className="relative z-10 flex items-center justify-between gap-2 mb-6">
                    <div className="font-mono text-xl sm:text-2xl tracking-[0.22em] font-bold text-white drop-shadow select-all truncate">
                      {selectedCard.displayPan}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedCard.pan, "pan")}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-white/25"
                      title="Copy Card PAN"
                    >
                      {copiedKey === "pan" ? (
                        <Check className="size-3 text-emerald-300" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{copiedKey === "pan" ? "Copied" : "Copy PAN"}</span>
                    </button>
                  </div>

                  {/* Card Footer Details */}
                  <div className="relative z-10 flex justify-between items-end text-xs font-mono">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                        Cardholder Name
                      </span>
                      <span className="font-bold text-white tracking-wide uppercase">
                        {cardHolder}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                        Expires
                      </span>
                      <span className="font-bold text-white">{selectedCard.exp}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                        CVC
                      </span>
                      <span className="font-bold text-white">{selectedCard.cvv}</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields: Cardholder, Number, Exp, CVC */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-muted-foreground font-medium mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground font-medium mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-muted-foreground font-medium mb-1">Expiry</label>
                        <input
                          type="text"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 font-mono text-foreground text-center focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-muted-foreground font-medium mb-1">CVC</label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 font-mono text-foreground text-center focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulation Actions */}
                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => handleSimulate("succeeded")}
                    disabled={loading || status === "succeeded"}
                    className="w-full py-6 font-bold text-sm bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 rounded-xl cursor-pointer transition-all"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="size-4 mr-2" />
                    )}
                    <span>Authorize & Settle Payment (200 OK)</span>
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIs3DSOpen(true)}
                      disabled={loading || isTerminal}
                      className="w-full py-5 text-xs text-primary border-primary/30 hover:bg-primary/10 rounded-xl cursor-pointer transition-all"
                    >
                      <Smartphone className="size-3.5 mr-1.5" />
                      <span>Simulate 3DS Challenge</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSimulate("failed")}
                      disabled={loading || isTerminal}
                      className="w-full py-5 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all"
                    >
                      <XCircle className="size-3.5 mr-1.5" />
                      <span>Simulate Card Decline (402)</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FAWRY KIOSK SIMULATOR */}
            {activeTab === "fawry" && (
              <div className="space-y-6">
                {/* Fawry Voucher Visualizer */}
                <div className="rounded-3xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-border/70">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/assets/fawry.webp"
                        alt="Fawry"
                        width={68}
                        height={28}
                        className="object-contain"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Fawry Pay Kiosk Voucher
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      EXPIRES IN 48H
                    </span>
                  </div>

                  <div className="py-6 text-center space-y-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium block">
                      Fawry Reference Code
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-foreground select-all">
                        {fawryRefCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(fawryRefCode, "fawry")}
                        className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Copy Reference Code"
                      >
                        {copiedKey === "fawry" ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Present this 9-digit code at any of 180,000+ Fawry retail kiosks or POS
                      terminals across Egypt to settle in cash.
                    </p>
                  </div>

                  {/* Simulated Barcode */}
                  <div className="pt-4 border-t border-border/60 flex flex-col items-center gap-1.5">
                    <div className="h-10 w-full max-w-[280px] flex items-center justify-center gap-1 opacity-70">
                      {[1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map(
                        (width, i) => (
                          <div
                            key={i}
                            className="h-full bg-foreground"
                            style={{ width: `${width * 2}px` }}
                          />
                        ),
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                      REF-{fawryRefCode}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() =>
                      handleSimulate("succeeded", "Simulating cash payment at Fawry retail kiosk...")
                    }
                    disabled={loading || status === "succeeded"}
                    className="w-full py-6 font-bold text-sm bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg shadow-amber-600/25 rounded-xl cursor-pointer transition-all"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <Store className="size-4 mr-2" />
                    )}
                    <span>Simulate Fawry Kiosk Cash Settlement (200 OK)</span>
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: WIRE TELEMETRY JSON */}
            {activeTab === "telemetry" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Canonical Ingress Wire State</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(
                          {
                            id: paymentId,
                            merchant_reference: merchantReference,
                            amount_minor_units: amountMinorUnits,
                            currency,
                            status,
                            provider: "mock",
                            next_action: {
                              type: "redirect",
                              url: `https://openwrapper.muejam.com/mock/pay/${paymentId}`,
                            },
                            customer: {
                              phone: customerPhone,
                              email: customerEmail,
                              name: customerName,
                            },
                          },
                          null,
                          2,
                        ),
                        "json",
                      )
                    }
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {copiedKey === "json" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span>Copy JSON</span>
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-muted/50 border border-border/80 font-mono text-[11px] leading-relaxed text-foreground overflow-x-auto select-all">
                  {JSON.stringify(
                    {
                      id: paymentId,
                      merchant_reference: merchantReference,
                      amount_minor_units: amountMinorUnits,
                      currency,
                      status,
                      provider: "mock",
                      invariants: {
                        I1_integer_math: true,
                        I3_zero_secrets_stored: true,
                        I4_strict_idempotency: true,
                      },
                      customer: {
                        phone: customerPhone,
                        email: customerEmail,
                        name: customerName,
                      },
                      created_at: new Date().toISOString(),
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}

            {/* Action Notification & Auto-Redirect Progress Bar */}
            {actionMessage && (
              <div className="mt-6 space-y-2">
                <div
                  className={cn(
                    "p-4 rounded-2xl text-xs font-medium flex items-center gap-3 transition-all",
                    status === "succeeded" &&
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                    status === "failed" &&
                      "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                    !isTerminal && "bg-primary/10 text-primary border border-primary/20",
                  )}
                >
                  {loading && redirectProgress === 0 ? (
                    <Loader2 className="size-4.5 animate-spin text-primary shrink-0" />
                  ) : status === "succeeded" ? (
                    <CheckCircle2 className="size-4.5 text-emerald-500 shrink-0" />
                  ) : status === "failed" ? (
                    <XCircle className="size-4.5 text-rose-500 shrink-0" />
                  ) : null}
                  <div className="flex-1 truncate">
                    <span className="font-semibold block">{actionMessage}</span>
                    {redirectProgress > 0 && (
                      <span className="text-[11px] opacity-80">
                        Returning in {Math.ceil((100 - redirectProgress) / 80)}s...
                      </span>
                    )}
                  </div>
                </div>

                {/* Animated Redirect Countdown Bar */}
                {redirectProgress > 0 && (
                  <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-100 ease-linear",
                        status === "succeeded" ? "bg-emerald-500" : "bg-rose-500",
                      )}
                      style={{ width: `${redirectProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Security Guarantee Strip */}
            <div className="mt-8 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary" />
                <span>Zero-Knowledge Stateless Transit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>PCI SAQ-A Certified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" />
                <span>OpenWrapper v0.2.0 LTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SIMULATED 3D SECURE MODAL */}
      {is3DSOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card text-foreground border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setIs3DSOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">3D Secure 2.0 Identity Check</h3>
                <p className="text-xs text-muted-foreground">Simulated Bank Authentication</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant:</span>
                <span className="font-semibold text-foreground">OpenWrapper Store</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-bold text-foreground">{amountFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auth Channel:</span>
                <span className="font-mono text-foreground">SMS ({customerPhone})</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                Enter 6-Digit SMS Verification Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-primary transition-colors"
              />
              <span className="text-[11px] text-muted-foreground block text-center">
                Sandbox test PIN: <span className="font-mono font-semibold text-primary">123456</span>
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setIs3DSOpen(false)
                  handleSimulate("succeeded", "3DS verification approved! Settling payment...")
                }}
                disabled={loading}
                className="w-full py-5 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer transition-all"
              >
                <Check className="size-4 mr-2" />
                <span>Confirm & Authorize Payment</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIs3DSOpen(false)}
                className="w-full py-4 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel Authentication
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
