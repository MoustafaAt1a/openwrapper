"use client"

import { useState } from "react"
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Save,
  Send,
  Shield,
  Webhook,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GooDropzone } from "@/components/ui/goo-dropzone"
import { Input } from "@/components/ui/input"

interface MerchantSettingsConsoleProps {
  initialOrgName?: string
  initialEmail?: string
}

export function MerchantSettingsConsole({
  initialOrgName = "OpenWrapper Enterprise",
  initialEmail = "merchant@openwrapper.internal",
}: MerchantSettingsConsoleProps) {
  const [orgName, setOrgName] = useState(initialOrgName)
  const [billingEmail, setBillingEmail] = useState(initialEmail)
  const [currency, setCurrency] = useState("EGP")
  const [webhookUrl, setWebhookUrl] = useState("https://api.merchant.io/v1/webhooks/openwrapper")
  const [showSecret, setShowSecret] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null)

  const webhookSecret = "whsec_live_9a4f2c0b8e7d1a3c5e8b2d4f6a8c0e2d"

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(webhookSecret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      // clipboard fallback
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true)
    setWebhookTestStatus(null)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsTestingWebhook(false)
    setWebhookTestStatus("Delivered mock ping (HTTP 200 OK, latency: 42ms)")
    setTimeout(() => setWebhookTestStatus(null), 5000)
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
            Manage organization defaults, webhook signing secrets, and gateway algorithmic
            invariants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] gap-1.5 py-1 px-3">
            <Lock className="size-3 text-primary" />
            Stateless Zero-Knowledge
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px] gap-1.5 py-1 px-3">
            <Shield className="size-3 text-emerald-500" />
            Invariant Enforced
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
              <select
                id="defaultCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground stripe-input-focus transition-all"
              >
                <option value="EGP">EGP — Egyptian Pound (CBE Cleared)</option>
                <option value="SAR">SAR — Saudi Riyal (SAMA Cleared)</option>
                <option value="AED">AED — UAE Dirham (CBUAE Cleared)</option>
                <option value="USD">USD — US Dollar (ACH / SWIFT)</option>
                <option value="EUR">EUR — Euro (SEPA Rail)</option>
              </select>
              <p className="text-[11px] text-muted-foreground font-light">
                All internal ledger calculations are preserved as discrete 64-bit integer minor
                units.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground font-mono">
                  Invariant I1
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Discrete minor unit integer math (
                  <code className="font-mono text-primary font-medium">i64</code>). Zero
                  floating-point rounding errors.
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground font-mono">
                  Invariant I9
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Largest Remainder method (Hamilton-Hare) apportionment. Zero fund creation or
                  leakage during splits.
                </span>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex flex-col gap-1 stripe-card-shadow-xs">
                <span className="text-xs font-semibold text-foreground font-mono">
                  Invariant I10
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed font-light">
                  Millisecond sliding-window counter approximation preventing boundary burst
                  rate-limit attacks.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Webhook Delivery & Signing Secrets */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Webhook className="size-4 text-primary" />
              Webhook Notifications & HMAC-SHA256
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
              Asynchronous transaction state change notifications signed with your merchant secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-4">
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
                  placeholder="https://your-domain.com/webhooks"
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
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1 animate-rise">
                  ✓ {webhookTestStatus}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <label htmlFor="webhookSecret" className="text-xs font-medium text-foreground">
                Webhook Signing Secret (HMAC-SHA256)
              </label>
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
                <code className="font-mono text-foreground">
                  X-OpenWrapper-Signature: t=...,v1=...
                </code>{" "}
                using constant-time equality.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Brand Assets Upload */}
        <Card className="rounded-2xl border border-border bg-card/90 backdrop-blur-md stripe-card-shadow-sm p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Globe className="size-4 text-primary" />
              Brand Assets
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-light mt-0.5">
              Upload your merchant logo and brand assets for checkout rail presentation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <GooDropzone accept="image/png,image/jpeg,image/svg+xml" maxSizeMb={2} />
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs text-muted-foreground font-light">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-rise">
                ✓ Preferences updated successfully.
              </span>
            ) : (
              <span>All updates apply immediately to active API sessions.</span>
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
