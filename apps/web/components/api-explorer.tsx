"use client"

import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  PlayIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const presets = {
  paymob: {
    name: "Paymob Cards & Wallets",
    rail: "Egypt / MENA",
    method: "POST",
    path: "/api/v1/payments",
    badge: "EGP",
    color: "text-[#533afd] bg-[#533afd]/10 border-[#533afd]/20",
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
    color: "text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/20",
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

export function ApiExplorer() {
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
          !/^\/api\/v1\/(?:health|payments(?:\/[A-Za-z0-9_-]{1,128})?)$/.test(requestUrl.pathname)
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
        : '  -H "X-Paymob-Secret-Key: $PAYMOB_SECRET_KEY" \\\n  -H "X-Paymob-Integration-Id: $PAYMOB_INTEGRATION_ID" \\'

  const generatedCurl = `curl -X ${method} "${originUrl}${endpoint}" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Idempotency-Key: idem_${Date.now()}" \\
  -H "Content-Type: application/json" \\
${curlProviderHeaders}
  -d '${body ? body.replace(/\n\s*/g, " ") : "{}"}'`

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
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]">
          Select Gateway Preset
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(Object.keys(presets) as Array<keyof typeof presets>).map((keyName) => {
            const p = presets[keyName]
            const isSelected = selectedPreset === keyName
            return (
              <button
                key={keyName}
                type="button"
                onClick={() => applyPreset(keyName)}
                className={`text-left flex flex-col justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#533afd] bg-[#533afd]/10 shadow-xs"
                    : "border-[#e3e8ee] dark:border-white/10 bg-[#f6f9fc]/60 dark:bg-[#111630]/40 hover:border-[#533afd]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0d253d] dark:text-white truncate">
                    {p.name}
                  </span>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${p.color}`}>
                    {p.badge}
                  </span>
                </div>
                <span className="text-[10px] text-[#64748d] dark:text-[#8ca3ba] font-mono mt-1">
                  {p.rail}
                </span>
              </button>
            )
          })}
        </div>
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
                className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
              >
                Environment & Token
              </label>

              {/* Mode Toggle Pills */}
              <div className="inline-flex items-center gap-0.5 rounded-full bg-[#f0f4f8] dark:bg-[#141b33] p-0.5 border border-[#e3e8ee] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setApiEnv("test")
                    if (!key || key === "ow_live_production_key") {
                      setKey("ow_test_sandbox_demo")
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-all cursor-pointer ${
                    apiEnv === "test"
                      ? "bg-amber-500 text-white font-semibold shadow-xs"
                      : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
                  }`}
                >
                  Test (ow_test_)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiEnv("live")
                    if (key === "ow_test_sandbox_demo") {
                      setKey("")
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-all cursor-pointer ${
                    apiEnv === "live"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white"
                  }`}
                >
                  Live (ow_live_)
                </button>
              </div>
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
                className="font-mono text-xs bg-[#f6f9fc]/80 dark:bg-[#111630]/60 border-[#e3e8ee] dark:border-white/10 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-[10px] text-[#64748d] dark:text-[#8ca3ba] hover:text-[#0d253d] dark:hover:text-white flex items-center gap-1 font-mono cursor-pointer"
              >
                <HugeiconsIcon icon={showKey ? ViewOffIcon : ViewIcon} size={12} />
                <span>{showKey ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>

          {/* Method & Endpoint Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="explorer-endpoint"
              className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
            >
              Endpoint Route
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 ${
                  method === "POST"
                    ? "bg-[#533afd]/15 text-[#533afd] dark:text-[#8c82fc] border border-[#533afd]/20"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {method}
              </span>
              <Input
                id="explorer-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs bg-[#f6f9fc]/80 dark:bg-[#111630]/60 border-[#e3e8ee] dark:border-white/10 flex-1"
              />
            </div>
          </div>

          {/* JSON Payload Editor */}
          {method === "POST" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="explorer-payload"
                  className="text-[11px] font-mono uppercase tracking-wider text-[#64748d] dark:text-[#8ca3ba]"
                >
                  JSON Payload
                </label>
                <span className="text-[10px] font-mono text-[#64748d] dark:text-[#8ca3ba]">
                  i64 minor units
                </span>
              </div>
              <Textarea
                id="explorer-payload"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs leading-relaxed bg-[#0c1024] text-[#a1b0cb] border-[#1e2646] resize-none rounded-xl"
              />
            </div>
          )}

          {/* Primary Action Button */}
          <Button
            onClick={run}
            disabled={pending}
            className="w-full font-mono text-xs font-semibold py-2.5 rounded-xl bg-[#533afd] hover:bg-[#432ec4] text-white shadow-md transition-all cursor-pointer"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Dispatching Gateway Wire...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={PlayIcon} size={15} />
                <span>Execute Request</span>
              </span>
            )}
          </Button>
        </div>

        {/* Right Column: Response & Code Snippets Terminal (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2 rounded-2xl border border-[#1e2646] bg-[#0c1024] overflow-hidden shadow-xl">
          {/* Terminal Tabs & Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2646] px-4 py-2.5 bg-[#090d1f]">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { key: "response" as const, label: "Live Response" },
                { key: "ts" as const, label: "TypeScript" },
                { key: "php" as const, label: "PHP" },
                { key: "dotnet" as const, label: ".NET" },
                { key: "curl" as const, label: "cURL" },
                { key: "python" as const, label: "Python" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-[#533afd] text-white font-medium"
                      : "text-[#8ca3ba] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status & Copy */}
            <div className="flex items-center gap-2">
              {statusCode !== null && (
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    statusCode >= 200 && statusCode < 300
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-[#ea2261]/15 text-[#ea2261] border border-[#ea2261]/20"
                  }`}
                >
                  {statusCode} {statusCode === 200 ? "OK" : "ERROR"}
                </span>
              )}
              {latencyMs !== null && (
                <span className="font-mono text-[10px] text-emerald-400">{latencyMs}ms</span>
              )}
              <button
                type="button"
                onClick={() => copyCode(activeContent)}
                aria-label="Copy snippet"
                className="p-1.5 rounded-lg text-[#8ca3ba] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <HugeiconsIcon
                  icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                  size={14}
                  className={copied ? "text-emerald-400" : "text-current"}
                />
              </button>
            </div>
          </div>

          {/* Terminal Code Box */}
          <pre className="min-h-[380px] max-h-[500px] overflow-auto p-4 font-mono text-xs leading-relaxed select-all text-[#f6f9fc] bg-[#0c1024]">
            <code>{activeContent}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
