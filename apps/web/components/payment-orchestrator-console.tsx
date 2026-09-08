"use client"

import { CheckCircle2, Copy, Eye, EyeOff, Play } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GooTabs, SlidingCardSelector } from "@/components/ui/goo-tabs"
import { CodeHighlighter } from "@/lib/code-syntax-highlighter"

const presets = {
  paymob: {
    name: "Paymob Cards & Wallets",
    rail: "Egypt / MENA",
    method: "POST",
    path: "/api/v1/payments",
    badge: "EGP",
    color: "text-primary bg-primary/10 border-primary/20",
    body: JSON.stringify(
      {
        provider: "paymob",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: {
          phone: "+201001234567",
          email: "buyer@example.com",
          full_name: "Ahmed Hassan",
        },
        merchant_reference: `ord_${Date.now().toString().slice(-6)}`,
        description: "OpenWrapper Pro Subscription",
        return_url: "https://example.com/checkout/complete",
      },
      null,
      2,
    ),
  },
  fawry: {
    name: "Fawry Retail Kiosk",
    rail: "Egypt Cash",
    method: "POST",
    path: "/api/v1/payments",
    badge: "Cash 8-digit",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    body: JSON.stringify(
      {
        provider: "fawry",
        amount_minor_units: 5000,
        currency: "EGP",
        customer: {
          phone: "+201201234567",
          email: "customer@example.com",
          full_name: "Sara Mahmoud",
        },
        merchant_reference: `fawry_${Date.now().toString().slice(-6)}`,
        description: "E-Commerce Order at Fawry Terminal",
      },
      null,
      2,
    ),
  },
  stripe: {
    name: "Stripe Checkout",
    rail: "Global Cards / 3DS",
    method: "POST",
    path: "/api/v1/payments",
    badge: "USD / EUR",
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    body: JSON.stringify(
      {
        provider: "stripe",
        amount_minor_units: 2499,
        currency: "USD",
        customer: {
          phone: "+15551234567",
          email: "user@example.com",
          full_name: "Alex Smith",
        },
        description: "SaaS Monthly License",
        return_url: "https://example.com/billing/success",
      },
      null,
      2,
    ),
  },
  mock: {
    name: "Mock Rail (Deterministic)",
    rail: "Deterministic Sandbox",
    method: "POST",
    path: "/api/v1/payments",
    badge: "Offline Test",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    body: JSON.stringify(
      {
        provider: "mock",
        amount_minor_units: 10000,
        currency: "EGP",
        customer: {
          phone: "+201000000000",
          email: "mock-tester@example.com",
          full_name: "Mock Tester",
        },
        merchant_reference: `mock_${Date.now().toString().slice(-6)}`,
        description: "Deterministic Simulation (% 100 == 99 declines, % 100 == 88 times out)",
      },
      null,
      2,
    ),
  },
  health: {
    name: "Gateway Health Probe",
    rail: "Diagnostics",
    method: "GET",
    path: "/api/v1/health",
    badge: "GET",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    body: "",
  },
}

export function PaymentOrchestratorConsole() {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presets>("paymob")
  const [apiEnv, setApiEnv] = useState<"live" | "test">("test")
  const [key, setKey] = useState("ow_test_sandbox_demo")
  const [showKey, setShowKey] = useState(false)
  const [endpoint, setEndpoint] = useState(presets.paymob.path)
  const [method, setMethod] = useState(presets.paymob.method)
  const [body, setBody] = useState(presets.paymob.body)
  const [result, setResult] = useState<string>(
    "Ready to test. Select a preset and click 'Execute Request'.",
  )
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<
    "response" | "ts" | "php" | "dotnet" | "curl" | "python"
  >("response")
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function applyPreset(presetKey: keyof typeof presets) {
    setSelectedPreset(presetKey)
    const p = presets[presetKey]
    setMethod(p.method)
    setEndpoint(p.path)
    setBody(p.body)
    setStatusCode(null)
    setLatencyMs(null)
  }

  function run() {
    startTransition(async () => {
      const startTime = performance.now()
      try {
        const requestUrl = new URL(endpoint, window.location.origin)
        if (
          requestUrl.origin !== window.location.origin ||
          !/^\/api\/(?:v[0-9]+)\/(?:health|payments(?:\/[A-Za-z0-9_-]{1,128})?)$/.test(
            requestUrl.pathname,
          )
        ) {
          throw new Error("Only same-origin OpenWrapper health and payment endpoints are allowed.")
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Idempotency-Key": `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        }
        if (key.trim()) {
          headers.Authorization = `Bearer ${key.trim()}`
        }

        const init: RequestInit = {
          method,
          headers,
        }
        if (method === "POST" && body.trim()) {
          init.body = body
        }

        const res = await fetch(`${requestUrl.pathname}${requestUrl.search}`, init)
        const duration = Math.round(performance.now() - startTime)
        setStatusCode(res.status)
        setLatencyMs(duration)

        const json = await res.json().catch(() => ({ error: { message: "Invalid JSON response" } }))
        setResult(JSON.stringify(json, null, 2))
        setActiveTab("response")
      } catch (err) {
        const duration = Math.round(performance.now() - startTime)
        setStatusCode(500)
        setLatencyMs(duration)
        setResult(
          JSON.stringify(
            {
              error: {
                message: (err as Error).message || "Request failed",
                hint: "Ensure the gateway is running and your API key is valid.",
              },
            },
            null,
            2,
          ),
        )
        setActiveTab("response")
      }
    })
  }

  const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  const sampleKey =
    key.trim() || (apiEnv === "test" ? "ow_test_sandbox_demo" : "ow_live_production_key")

  const generatedTs = `import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "${originUrl}",
  apiKey: process.env.OPENWRAPPER_API_KEY, // e.g. "${sampleKey}" (${apiEnv === "test" ? "Sandbox Test Mode" : "Production Live Mode"})
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secureKey: process.env.FAWRY_SECURE_KEY,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    }
  },
});

const payment = await client.payments.create(${body || "{}"});
console.log("Payment URL:", payment.nextAction?.url || payment.paymentId);`

  const generatedPhp = `<?php
use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: '${originUrl}',
    apiKey: getenv('OPENWRAPPER_API_KEY'), // e.g. '${sampleKey}' (${apiEnv === "test" ? "Test Mode" : "Live Mode"})
    providers: [
        'paymob' => [
            'secret_key' => getenv('PAYMOB_SECRET_KEY'),
            'public_key' => getenv('PAYMOB_PUBLIC_KEY'),
            'hmac_secret' => getenv('PAYMOB_HMAC_SECRET'),
        ],
        'fawry' => [
            'merchant_code' => getenv('FAWRY_MERCHANT_CODE'),
            'secure_key' => getenv('FAWRY_SECURE_KEY'),
        ],
        'stripe' => [
            'secret_key' => getenv('STRIPE_SECRET_KEY'),
        ]
    ]
);

$payment = $client->createPayment(
    new CreatePaymentParams(
        provider: '${selectedPreset === "fawry" ? "fawry" : selectedPreset === "stripe" ? "stripe" : "paymob"}',
        amountMinorUnits: 10000,
        currency: 'EGP',
        customer: new CustomerDetails(phone: '+201001234567', email: 'buyer@example.com', fullName: 'Ahmed Hassan')
    )
);

echo "Payment Status: " . $payment->status->value;`

  const generatedDotnet = `using OpenWrapper;
using OpenWrapper.Models;
using OpenWrapper.Providers;

var options = new OpenWrapperClientOptions
{
    BaseUrl = "${originUrl}",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"), // e.g. "${sampleKey}"
    Providers = new ProviderCredentials
    {
        Paymob = new PaymobCredentials
        {
            SecretKey = Environment.GetEnvironmentVariable("PAYMOB_SECRET_KEY"),
            PublicKey = Environment.GetEnvironmentVariable("PAYMOB_PUBLIC_KEY"),
            HmacSecret = Environment.GetEnvironmentVariable("PAYMOB_HMAC_SECRET"),
        },
        Fawry = new FawryCredentials
        {
            MerchantCode = Environment.GetEnvironmentVariable("FAWRY_MERCHANT_CODE"),
            SecureKey = Environment.GetEnvironmentVariable("FAWRY_SECURE_KEY"),
        },
        Stripe = new StripeCredentials
        {
            SecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY"),
        },
    },
};

await using var client = new OpenWrapperClient(options);
var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "${selectedPreset === "fawry" ? "fawry" : selectedPreset === "stripe" ? "stripe" : "paymob"}",
    AmountMinorUnits = 10000,
    Currency = "EGP",
    Customer = new CustomerDetails { Phone = "+201001234567", Email = "buyer@example.com", FullName = "Ahmed Hassan" },
});
Console.WriteLine(payment.NextAction?.Url ?? payment.PaymentId);`

  const curlProviderHeaders =
    selectedPreset === "stripe"
      ? '  -H "X-Stripe-Secret-Key: $STRIPE_SECRET_KEY" \\'
      : selectedPreset === "fawry"
        ? '  -H "X-Fawry-Merchant-Code: $FAWRY_MERCHANT_CODE" \\\n  -H "X-Fawry-Secure-Key: $FAWRY_SECURE_KEY" \\'
        : selectedPreset === "mock"
          ? '  -H "X-Mock-Mode: deterministic" \\'
          : selectedPreset === "health"
            ? ""
            : '  -H "X-Paymob-Secret-Key: $PAYMOB_SECRET_KEY" \\\n  -H "X-Paymob-Integration-Id: $PAYMOB_INTEGRATION_ID" \\'

  const generatedCurl = `curl -X ${method} "${originUrl}${endpoint}" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Idempotency-Key: idem_$(date +%s)" \\
  -H "Content-Type: application/json" \\
${curlProviderHeaders ? `${curlProviderHeaders}\n` : ""}  -d '${body ? body.replace(/\n\s*/g, " ") : "{}"}'`

  const generatedPython = `import requests

url = "${originUrl}${endpoint}"
headers = {
    "Authorization": f"Bearer {OPENWRAPPER_API_KEY}",
    "Idempotency-Key": f"idem_{int(time.time())}",
    "Content-Type": "application/json",
}

response = requests.${method.toLowerCase()}(
    url,
    headers=headers,
    json=${body || "{}"}
)

print(response.json())`

  function copyCode(content: string) {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeContent =
    activeTab === "response"
      ? result
      : activeTab === "ts"
        ? generatedTs
        : activeTab === "php"
          ? generatedPhp
          : activeTab === "dotnet"
            ? generatedDotnet
            : activeTab === "curl"
              ? generatedCurl
              : generatedPython

  return (
    <div className="flex flex-col gap-6">
      {/* Preset Selector Strip */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Select Gateway Preset
        </span>
        <SlidingCardSelector
          items={(Object.keys(presets) as Array<keyof typeof presets>).map((keyName) => {
            const p = presets[keyName]
            return {
              id: keyName,
              content: (
                <div className="flex flex-col justify-between p-3 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                    <span
                      className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${p.color}`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">{p.rail}</span>
                </div>
              ),
            }
          })}
          activeId={selectedPreset}
          onSelect={(id) => applyPreset(id as keyof typeof presets)}
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
        />
      </div>

      {/* Main Two-Column Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request Configuration (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* API Key Input & Environment Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="explorer-key"
                className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
              >
                Environment & Token
              </label>

              {/* Mode Toggle Pills — Sliding Indicator */}
              <GooTabs
                items={[
                  { id: "test", label: "Test (ow_test_)" },
                  { id: "live", label: "Live (ow_live_)" },
                ]}
                activeId={apiEnv}
                onTabChange={(id) => {
                  if (id === "test") {
                    setApiEnv("test")
                    if (!key || key === "ow_live_production_key") {
                      setKey("ow_test_sandbox_demo")
                    }
                  } else {
                    setApiEnv("live")
                    if (key === "ow_test_sandbox_demo") {
                      setKey("")
                    }
                  }
                }}
                className="bg-secondary border border-border"
                indicatorClassName={
                  apiEnv === "test" ? "bg-amber-500 shadow-xs" : "bg-emerald-600 shadow-xs"
                }
                size="sm"
              />
            </div>

            <div className="relative">
              <Input
                id="explorer-key"
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  apiEnv === "test"
                    ? "ow_test_... (sandbox simulation key)"
                    : "ow_live_... (paste from your live API keys)"
                }
                className="font-mono text-xs bg-background border-border pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showKey ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>

          {/* Method & Endpoint Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="explorer-endpoint"
              className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
            >
              Endpoint Route
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 ${
                  method === "POST"
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {method}
              </span>
              <Input
                id="explorer-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs bg-background border-border flex-1"
              />
            </div>
          </div>

          {/* JSON Payload Editor */}
          {method === "POST" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="explorer-payload"
                  className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground"
                >
                  JSON Payload
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(body)
                        setBody(JSON.stringify(parsed, null, 2))
                      } catch {}
                    }}
                    className="text-[10.5px] font-mono text-primary hover:underline cursor-pointer font-medium"
                    title="Format and prettify JSON payload"
                  >
                    Format JSON
                  </button>
                  <span className="text-border text-xs">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    i64 minor units
                  </span>
                </div>
              </div>
              <Textarea
                id="explorer-payload"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs leading-relaxed bg-card text-foreground border-border resize-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          )}

          {/* Primary Action Button */}
          <Button
            onClick={run}
            disabled={pending}
            className="w-full font-mono text-xs font-semibold py-2.5 rounded-xl bg-primary hover:bg-primary-deep text-primary-foreground stripe-card-shadow-xs transition-all cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Dispatching Gateway Wire...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" />
                <span>Execute Request</span>
              </span>
            )}
          </Button>
        </div>

        {/* Right Column: Mac Light Mode Terminal & Code Snippets (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-border bg-card overflow-hidden stripe-card-shadow-sm">
          {/* Mac Titlebar & Tab Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 bg-muted/60 select-none">
            {/* Window Dots + Tabs */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="size-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/80" />
                <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/80" />
                <span className="size-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/80" />
              </div>

              {/* Mac Segmented Tab Controls — Sliding Indicator */}
              <GooTabs
                items={[
                  { id: "response", label: "Live Response" },
                  { id: "ts", label: "TypeScript" },
                  { id: "php", label: "PHP" },
                  { id: "dotnet", label: ".NET" },
                  { id: "curl", label: "cURL" },
                ]}
                activeId={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
                className="bg-muted border border-border"
                indicatorClassName="bg-card text-foreground shadow-2xs"
                size="sm"
              />
            </div>

            {/* Status & Copy */}
            <div className="flex items-center gap-2">
              {statusCode !== null && (
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    statusCode >= 200 && statusCode < 300
                      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                      : "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                  }`}
                >
                  {statusCode} {statusCode === 200 ? "OK" : "ERROR"}
                </span>
              )}
              {latencyMs !== null && (
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                  {latencyMs}ms
                </span>
              )}
              <button
                type="button"
                onClick={() => copyCode(activeContent)}
                aria-label="Copy snippet"
                className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-[10px] font-mono">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Mac Light Mode Editor Body with Prism Syntax Highlighting & Line Numbers */}
          <div className="min-h-[380px] max-h-[500px] overflow-auto p-4 font-mono text-xs leading-relaxed select-text text-foreground bg-card">
            <CodeHighlighter
              code={activeContent}
              language={
                activeTab === "response"
                  ? "json"
                  : activeTab === "ts"
                    ? "typescript"
                    : activeTab === "dotnet"
                      ? "csharp"
                      : activeTab === "php"
                        ? "php"
                        : activeTab === "curl"
                          ? "bash"
                          : "typescript"
              }
              showLineNumbers={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const ApiExplorer = PaymentOrchestratorConsole
export default PaymentOrchestratorConsole
