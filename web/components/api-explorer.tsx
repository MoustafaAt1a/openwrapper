"use client"

import { useState, useTransition } from "react"
import { Check, Copy, LoaderCircle, Play, Sparkles, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const presets = {
  paymob: {
    name: "Paymob (Egypt)",
    method: "POST",
    path: "/api/v1/payments",
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
        description: "OpenWrapper Premium Subscription",
        return_url: "https://example.com/checkout/complete",
      },
      null,
      2
    ),
  },
  fawry: {
    name: "Fawry (Egypt)",
    method: "POST",
    path: "/api/v1/payments",
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
        description: "E-Commerce Order at Retail Kiosk",
      },
      null,
      2
    ),
  },
  stripe: {
    name: "Stripe (Global)",
    method: "POST",
    path: "/api/v1/payments",
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
        description: "SaaS Monthly Seat",
        return_url: "https://example.com/billing/success",
      },
      null,
      2
    ),
  },
  health: {
    name: "Health Probe",
    method: "GET",
    path: "/api/v1/health",
    body: "",
  },
}

export function ApiExplorer() {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presets>("paymob")
  const [key, setKey] = useState("")
  const [endpoint, setEndpoint] = useState(presets.paymob.path)
  const [method, setMethod] = useState(presets.paymob.method)
  const [body, setBody] = useState(presets.paymob.body)
  const [result, setResult] = useState("Select a preset, enter your API key, and send the request.")
  const [activeTab, setActiveTab] = useState<"response" | "ts" | "php" | "curl" | "python">("response")
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function applyPreset(presetKey: keyof typeof presets) {
    setSelectedPreset(presetKey)
    const p = presets[presetKey]
    setMethod(p.method)
    setEndpoint(p.path)
    setBody(p.body)
  }

  function run() {
    startTransition(async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Idempotency-Key": `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        }
        if (key.trim()) {
          headers["Authorization"] = `Bearer ${key.trim()}`
        }

        const init: RequestInit = {
          method,
          headers,
        }
        if (method === "POST" && body.trim()) {
          init.body = body
        }

        const res = await fetch(endpoint, init)
        const json = await res.json().catch(() => ({ error: { message: "Invalid JSON response" } }))
        setResult(JSON.stringify(json, null, 2))
        setActiveTab("response")
      } catch (err) {
        setResult(
          JSON.stringify(
            {
              error: {
                message: (err as Error).message || "Request failed",
                hint: "Ensure the gateway is running and your API key is valid.",
              },
            },
            null,
            2
          )
        )
        setActiveTab("response")
      }
    })
  }

  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://web-production-884cd.up.railway.app"

  const generatedTs = `import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "${originUrl}",
  apiKey: process.env.OPENWRAPPER_API_KEY, // "${key || "ow_live_your_api_key_here"}"
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
    apiKey: getenv('OPENWRAPPER_API_KEY'), // '${key || "ow_live_your_api_key_here"}'
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

  const generatedCurl = `curl -X ${method} "${originUrl}${endpoint}" \\
  -H "Authorization: Bearer ${key || "ow_live_your_api_key_here"}" \\
  -H "Idempotency-Key: idem_${Date.now()}" \\
  -H "X-Paymob-Secret-Key: $PAYMOB_SECRET_KEY" \\
  -H "X-Fawry-Merchant-Code: $FAWRY_MERCHANT_CODE" \\
  -H "Content-Type: application/json" ${body ? `\\\n  -d '${body.replace(/\n/g, " ")}'` : ""}`

  const generatedPython = `import requests

url = "${originUrl}${endpoint}"
headers = {
    "Authorization": "Bearer ${key || "ow_live_your_api_key_here"}",
    "Idempotency-Key": "idem_${Date.now()}",
    "X-Paymob-Secret-Key": "sec_live_...",
    "Content-Type": "application/json",
}

response = requests.${method.toLowerCase()}(url, json=${body || "{}"}, headers=headers)
print(response.json())`

  async function copyCode(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Preset Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-4">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mr-2 font-semibold">
          Presets:
        </span>
        {(Object.keys(presets) as (keyof typeof presets)[]).map((presetKey) => (
          <Button
            key={presetKey}
            size="sm"
            variant={selectedPreset === presetKey ? "default" : "outline"}
            className={`font-mono text-xs ${
              selectedPreset === presetKey
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "border-border/80 bg-card hover:bg-muted text-muted-foreground"
            }`}
            onClick={() => applyPreset(presetKey)}
          >
            {presets[presetKey].name}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Configurator */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="explorer-key" className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Bearer API Key
            </label>
            <Input
              id="explorer-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ow_live_... (paste from API keys tab)"
              className="font-mono text-xs bg-muted/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24">
              <label htmlFor="explorer-method" className="sr-only">HTTP Method</label>
              <Input id="explorer-method" value={method} readOnly className="font-mono text-xs text-center font-bold bg-muted/40" />
            </div>
            <div className="flex-1">
              <label htmlFor="explorer-endpoint" className="sr-only">Endpoint URL</label>
              <Input
                id="explorer-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs bg-muted/40"
              />
            </div>
          </div>

          {method === "POST" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="explorer-payload" className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  JSON Payload
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">Amounts in integer minor units</span>
              </div>
              <Textarea
                id="explorer-payload"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs leading-relaxed bg-muted/40 resize-none"
              />
            </div>
          )}

          <Button onClick={run} disabled={pending} className="w-full font-mono text-xs font-semibold shadow-xs">
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Executing Request...
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Send Authenticated Request
              </>
            )}
          </Button>
        </div>

        {/* Output Inspector & Code Generator */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={activeTab === "response" ? "secondary" : "ghost"}
                className={`font-mono text-xs ${activeTab === "response" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("response")}
              >
                Response
              </Button>
              <Button
                size="sm"
                variant={activeTab === "ts" ? "secondary" : "ghost"}
                className={`font-mono text-xs ${activeTab === "ts" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("ts")}
              >
                TypeScript
              </Button>
              <Button
                size="sm"
                variant={activeTab === "php" ? "secondary" : "ghost"}
                className={`font-mono text-xs ${activeTab === "php" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("php")}
              >
                PHP
              </Button>
              <Button
                size="sm"
                variant={activeTab === "curl" ? "secondary" : "ghost"}
                className={`font-mono text-xs ${activeTab === "curl" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("curl")}
              >
                cURL
              </Button>
              <Button
                size="sm"
                variant={activeTab === "python" ? "secondary" : "ghost"}
                className={`font-mono text-xs ${activeTab === "python" ? "font-semibold bg-muted" : "text-muted-foreground"}`}
                onClick={() => setActiveTab("python")}
              >
                Python
              </Button>
            </div>
            <Button
              size="icon-sm"
              variant="outline"
              className="border-border/80 bg-card"
              onClick={() =>
                copyCode(
                  activeTab === "response"
                    ? result
                    : activeTab === "ts"
                    ? generatedTs
                    : activeTab === "php"
                    ? generatedPhp
                    : activeTab === "curl"
                    ? generatedCurl
                    : generatedPython
                )
              }
              aria-label="Copy snippet"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <pre className="min-h-80 flex-1 overflow-auto rounded-xl border border-border/80 bg-[#161616] p-4 font-mono text-xs leading-6 select-all text-white shadow-md">
            <code>
              {activeTab === "response"
                ? result
                : activeTab === "ts"
                ? generatedTs
                : activeTab === "php"
                ? generatedPhp
                : activeTab === "curl"
                ? generatedCurl
                : generatedPython}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
