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
  const [activeTab, setActiveTab] = useState<"response" | "ts" | "curl" | "python">("response")
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
        const json = await res.json().catch(() => ({ status: res.statusText }))
        setResult(`HTTP ${res.status} ${res.statusText}\n\n${JSON.stringify(json, null, 2)}`)
        setActiveTab("response")
      } catch (err) {
        setResult(`Execution Error:\n${err instanceof Error ? err.message : "Request failed"}`)
      }
    })
  }

  const generatedTs = `import { OpenWrapperClient } from "@openwrapper/sdk";

const client = new OpenWrapperClient({
  baseUrl: "${typeof window !== "undefined" ? window.location.origin : "https://api.openwrapper.dev"}",
  apiKey: "${key || "opw_live_your_api_key_here"}",
});

const payment = await client.payments.create(${body || "{}"});
console.log("Payment status:", payment.status);`

  const generatedCurl = `curl -X ${method} "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}${endpoint}" \\
  -H "Authorization: Bearer ${key || "opw_live_your_api_key_here"}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: idem_${Date.now()}" ${body ? `\\\n  -d '${body.replace(/\n/g, " ")}'` : ""}`

  const generatedPython = `import requests

url = "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}${endpoint}"
headers = {
    "Authorization": "Bearer ${key || "opw_live_your_api_key_here"}",
    "Content-Type": "application/json",
    "Idempotency-Key": "idem_${Date.now()}",
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
              placeholder="opw_live_... (paste from API keys tab)"
              autoComplete="off"
              className="h-10 border-border/80 bg-card font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 font-bold border border-border/80">
              {method}
            </Badge>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="h-9 font-mono text-xs border-border/80 bg-card"
            />
          </div>

          {method === "POST" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="explorer-body" className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                JSON Payload (OpenAPI 3.1 Contract)
              </label>
              <Textarea
                id="explorer-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-64 font-mono text-xs leading-5 border-border/80 bg-card p-3 rounded-lg"
              />
            </div>
          )}

          <Button
            onClick={run}
            disabled={pending || !key.trim()}
            size="lg"
            className="w-full font-mono text-xs font-semibold shadow-2xs h-11"
          >
            {pending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Dispatching Request...
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
