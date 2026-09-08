"use client"

import { useState } from "react"
import {
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Palette,
  RefreshCw,
  Save,
  Send,
  Shield,
  Trash2,
  UploadCloud,
  Webhook,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { MerchantSettingsData } from "@/lib/merchant-settings-service"

const BRAND_COLOR_PRESETS = [
  { name: "Electric Violet", hex: "#6366f1" },
  { name: "Emerald Mint", hex: "#10b981" },
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Amber Gold", hex: "#f59e0b" },
  { name: "Crimson Rose", hex: "#f43f5e" },
  { name: "Midnight Slate", hex: "#0f172a" },
]

interface MerchantSettingsConsoleProps {
  initialSettings?: MerchantSettingsData
  initialOrgName?: string
  initialEmail?: string
}

export function MerchantSettingsConsole({
  initialSettings,
  initialOrgName = "OpenWrapper Enterprise",
  initialEmail = "merchant@openwrapper.internal",
}: MerchantSettingsConsoleProps) {
  const [orgName, setOrgName] = useState(initialSettings?.orgName ?? initialOrgName)
  const [billingEmail, setBillingEmail] = useState(initialSettings?.billingEmail ?? initialEmail)
  const [currency, setCurrency] = useState(initialSettings?.currency ?? "EGP")
  const [webhookUrl, setWebhookUrl] = useState(initialSettings?.webhookUrl ?? "")
  const [webhookSecret, setWebhookSecret] = useState(
    initialSettings?.webhookSecret ?? "whsec_live_initial_unconfigured_secret",
  )
  const [brandLogoUrl, setBrandLogoUrl] = useState(initialSettings?.brandLogoUrl ?? "")
  const [brandColor, setBrandColor] = useState(initialSettings?.brandColor ?? "#6366f1")
  const [brandName, setBrandName] = useState(initialSettings?.brandName ?? initialOrgName)

  const [showSecret, setShowSecret] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [webhookTestStatus, setWebhookTestStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [isRegeneratingSecret, setIsRegeneratingSecret] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(webhookSecret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      // clipboard fallback
    }
  }

  const handleRegenerateSecret = () => {
    if (
      !confirm(
        "Are you sure you want to roll your Webhook Secret? Any current webhooks using the old secret will fail signature validation.",
      )
    ) {
      return
    }
    setIsRegeneratingSecret(true)
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const newSecret = `whsec_${randomHex}`
    setWebhookSecret(newSecret)
    setIsRegeneratingSecret(false)
  }

  const handleFileUpload = (file: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, SVG, WebP).")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image file size must be less than 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setBrandLogoUrl(e.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          billingEmail,
          currency,
          webhookUrl,
          webhookSecret,
          brandLogoUrl,
          brandColor,
          brandName,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setSaveError(data.error || "Failed to save settings")
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch {
      setSaveError("Network error while saving settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookTestStatus({
        success: false,
        message: "Please enter a valid Webhook Destination URL first.",
      })
      return
    }

    setIsTestingWebhook(true)
    setWebhookTestStatus(null)

    try {
      const res = await fetch("/api/merchant/settings/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          webhookSecret: webhookSecret.trim(),
        }),
      })

      const data = await res.json()
      setWebhookTestStatus({
        success: Boolean(data.success),
        message:
          data.message ||
          (data.success ? "Ping delivered successfully." : "Failed to deliver ping."),
      })
    } catch (err: unknown) {
      const error = err as Error
      setWebhookTestStatus({
        success: false,
        message: `Delivery test failed: ${error.message}`,
      })
    } finally {
      setIsTestingWebhook(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Merchant Settings & Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage organization defaults, real webhook signing secrets, and checkout brand assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] gap-1.5 py-1 px-3">
            <Lock className="size-3 text-primary" />
            Stateless Zero-Knowledge
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px] gap-1.5 py-1 px-3">
            <Shield className="size-3 text-emerald-500" />
            Live Database Backed
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-8">
        {/* Section 1: Organization & Identity */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Globe className="size-4 text-primary" />
              Organization Profile
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
              Basic merchant entity details used for invoices, receipts, and client-facing checkout
              rails.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="orgName" className="text-xs font-medium text-foreground">
                Organization Legal Name
              </label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Payments Ltd."
                className="font-medium rounded-xl stripe-input-focus"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="billingEmail" className="text-xs font-medium text-foreground">
                Technical & Billing Email
              </label>
              <Input
                id="billingEmail"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@company.com"
                className="font-mono text-xs rounded-xl stripe-input-focus"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Settlement & Financial Currency */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CreditCard className="size-4 text-primary" />
              Settlement & Apportionment Policy
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
              Configure the default settlement currency and review monetary math constraints.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-5">
            <div className="flex flex-col gap-2 max-w-sm">
              <label htmlFor="defaultCurrency" className="text-xs font-medium text-foreground">
                Primary Settlement Currency
              </label>
              <div className="relative">
                <select
                  id="defaultCurrency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-border/80 bg-background/80 hover:bg-background px-3.5 pr-10 py-2 text-xs font-mono text-foreground stripe-input-focus shadow-2xs transition-all cursor-pointer"
                >
                  <option value="EGP">EGP — Egyptian Pound (CBE Cleared)</option>
                  <option value="SAR">SAR — Saudi Riyal (SAMA Cleared)</option>
                  <option value="AED">AED — UAE Dirham (CBUAE Cleared)</option>
                  <option value="USD">USD — US Dollar (ACH / SWIFT)</option>
                  <option value="EUR">EUR — Euro (SEPA Rail)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground font-light">
                All internal ledger calculations are preserved as discrete 64-bit integer minor
                units.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground">Discrete Minor Units</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Amounts are calculated strictly in integer cents/piastres without floating-point
                  rounding discrepancies.
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground">Multi-Rail Clearing</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Settlements clear directly through your upstream provider accounts (Paymob, Fawry,
                  or Stripe).
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground">
                  Automatic Reconciliation
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Transaction ledger entries automatically match provider reference numbers and
                  timestamps.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Webhook Delivery & Signing Secrets */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Webhook className="size-4 text-primary" />
                  Webhook Notifications & HMAC-SHA256
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
                  Asynchronous transaction state change notifications signed with your merchant
                  secret.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
              >
                Active Rail
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="webhookUrl" className="text-xs font-medium text-foreground">
                Production Webhook Destination URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/api/webhooks/openwrapper"
                  className="font-mono text-xs flex-1 rounded-xl stripe-input-focus"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  pill
                  onClick={handleTestWebhook}
                  isLoading={isTestingWebhook}
                  className="gap-1.5 font-mono text-xs shrink-0 stripe-card-shadow-xs"
                >
                  <Send className="size-3.5" />
                  Test Ping
                </Button>
              </div>

              {webhookTestStatus && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs font-mono flex items-start gap-2 animate-rise ${
                    webhookTestStatus.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400"
                  }`}
                >
                  <span className="font-bold">{webhookTestStatus.success ? "✓" : "⚠"}</span>
                  <div className="flex-1">{webhookTestStatus.message}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label htmlFor="webhookSecret" className="text-xs font-medium text-foreground">
                  Webhook Signing Secret (HMAC-SHA256)
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSecret}
                  disabled={isRegeneratingSecret}
                  className="text-[11px] font-mono text-primary hover:text-primary-deep flex items-center gap-1 cursor-pointer transition-colors"
                  title="Generate a new cryptographic secret"
                >
                  <RefreshCw className={`size-3 ${isRegeneratingSecret ? "animate-spin" : ""}`} />
                  Roll Secret
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="webhookSecret"
                    readOnly
                    type={showSecret ? "text" : "password"}
                    value={webhookSecret}
                    className="font-mono text-xs bg-muted/40 pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showSecret ? "Hide webhook secret" : "Show webhook secret"}
                  >
                    {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  pill
                  onClick={handleCopySecret}
                  className="gap-1.5 font-mono text-xs shrink-0 stripe-card-shadow-xs"
                >
                  {copiedSecret ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedSecret ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground font-light">
                Compare signatures with{" "}
                <code className="font-mono text-foreground font-medium">
                  X-OpenWrapper-Signature: t=...,v1=...
                </code>{" "}
                using constant-time equality.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Brand Assets & Checkout Experience */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Palette className="size-4 text-primary" />
                  Brand Identity & Checkout Assets
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
                  Customize your brand logo, colors, and live checkout rail presentation.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                Interactive Preview
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: Brand Configuration */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              {/* Brand Display Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="brandName" className="text-xs font-medium text-foreground">
                  Customer-Facing Brand Name
                </label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Stores"
                  className="rounded-xl stripe-input-focus"
                />
              </div>

              {/* Logo Upload Dropzone */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">Merchant Logo</span>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingFile(true)
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isDraggingFile
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border bg-muted/20 hover:bg-muted/30"
                  }`}
                >
                  {brandLogoUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative size-16 rounded-2xl border border-border bg-card p-2 shadow-xs flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={brandLogoUrl}
                          alt="Merchant Brand Logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground font-mono">
                          Logo Active
                        </span>
                        <button
                          type="button"
                          onClick={() => setBrandLogoUrl("")}
                          className="text-destructive hover:text-destructive/80 p-1 rounded-md text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <UploadCloud className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          Drag & drop merchant logo here, or{" "}
                          <label className="text-primary hover:underline cursor-pointer">
                            browse
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                              }}
                            />
                          </label>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supports PNG, SVG, JPG, or WebP up to 2MB.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Primary Brand Color Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-foreground">
                  Primary Checkout Accent Color
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {BRAND_COLOR_PRESETS.map((preset) => {
                    const isSelected = brandColor.toLowerCase() === preset.hex.toLowerCase()
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setBrandColor(preset.hex)}
                        title={preset.name}
                        className={`size-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "border-foreground scale-110 shadow-xs"
                            : "border-transparent opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="size-3.5 text-white" />}
                      </button>
                    )
                  })}

                  {/* Custom Hex input with native color picker */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="size-8 rounded-full cursor-pointer border border-border p-0.5 bg-transparent"
                      title="Custom HEX color picker"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#6366f1"
                      className="w-24 font-mono text-xs h-8 rounded-lg"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Checkout Preview */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                Live Rail Checkout Preview
              </span>
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm flex flex-col gap-4">
                {/* Checkout Rail Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    {brandLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brandLogoUrl}
                        alt="Logo"
                        className="size-7 rounded-lg object-contain bg-background border p-0.5"
                      />
                    ) : (
                      <div
                        className="size-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: brandColor }}
                      >
                        {brandName.slice(0, 1).toUpperCase() || "O"}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                      {brandName || "Merchant Name"}
                    </span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[9px] py-0 px-2">
                    SSL Secured
                  </Badge>
                </div>

                {/* Simulated Cart Items */}
                <div className="flex flex-col gap-1.5 py-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Order #OW-9281</span>
                    <span>1 Item</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground text-sm">
                    <span>Total Amount</span>
                    <span>450.00 {currency}</span>
                  </div>
                </div>

                {/* Styled Checkout Pay Button */}
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl text-white font-medium text-xs shadow-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2 cursor-default"
                  style={{ backgroundColor: brandColor }}
                >
                  <CreditCard className="size-3.5" />
                  <span>Pay 450.00 {currency}</span>
                </button>

                <div className="text-[10px] text-center text-muted-foreground/80 flex items-center justify-center gap-1.5">
                  <Lock className="size-2.5" />
                  <span>Protected by OpenWrapper Gateway</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs text-muted-foreground font-light">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-rise">
                ✓ Preferences updated successfully in database.
              </span>
            ) : saveError ? (
              <span className="text-destructive font-medium animate-rise">✕ {saveError}</span>
            ) : (
              <span>All updates apply immediately to active API sessions and checkout rails.</span>
            )}
          </div>
          <Button
            type="submit"
            isLoading={isSaving}
            pill
            className="gap-2 px-6 stripe-card-shadow-sm hover:stripe-card-shadow-hover"
          >
            <Save className="size-4" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}
