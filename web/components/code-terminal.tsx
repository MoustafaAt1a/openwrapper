"use client"

import { useState } from "react"
import { Check, Copy, Terminal } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const snippets = {
  typescript: {
    lang: "typescript",
    name: "TypeScript SDK",
    filename: "checkout.ts",
    code: `import { OpenWrapper } from "@openwrapper/sdk"

const ow = new OpenWrapper({ apiKey: process.env.OPENWRAPPER_KEY })

// One unified call across Paymob, Fawry, or Stripe
const payment = await ow.payments.create({
  provider: "paymob", // or "fawry" | "stripe"
  amount_minor_units: 50000, // 500.00 EGP (strictly integer)
  currency: "EGP",
  customer: {
    phone: "+201001234567",
    full_name: "Omar Hassan",
    email: "omar@example.com",
  },
  merchant_reference: "order_84920",
}, {
  idempotencyKey: "req_f829a1_2026",
})

// Lossless next-action inspection
console.log(payment.next_action)
// => { type: "redirect_to_url", url: "https://accept.paymob.com/..." }`,
  },
  curl: {
    lang: "bash",
    name: "cURL",
    filename: "request.sh",
    code: `curl -X POST "https://api.openwrapper.dev/v1/payments" \\
  -H "Authorization: Bearer ow_live_secret_key_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: req_f829a1_2026" \\
  -d '{
    "provider": "fawry",
    "amount_minor_units": 25000,
    "currency": "EGP",
    "customer": {
      "phone": "+201201234567",
      "full_name": "Sara Mahmoud"
    },
    "merchant_reference": "inv_9042"
  }'`,
  },
  python: {
    lang: "python",
    name: "Python",
    filename: "payment.py",
    code: `import os
import requests

url = "https://api.openwrapper.dev/v1/payments"
headers = {
    "Authorization": f"Bearer {os.getenv('OPENWRAPPER_KEY')}",
    "Content-Type": "application/json",
    "Idempotency-Key": "req_f829a1_2026",
}
payload = {
    "provider": "stripe",
    "amount_minor_units": 4900,  # $49.00 USD
    "currency": "USD",
    "customer": {"email": "alex@enterprise.com", "phone": "+15551234567"},
    "merchant_reference": "sub_9210",
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code, response.json())`,
  },
  php: {
    lang: "php",
    name: "PHP SDK",
    filename: "charge.php",
    code: `<?php
require_once __DIR__ . '/vendor/autoload.php';

use OpenWrapper\\OpenWrapperClient;

$client = new OpenWrapperClient([
    'apiKey' => getenv('OPENWRAPPER_KEY')
]);

$payment = $client->payments->create([
    'provider' => 'fawry',
    'amount_minor_units' => 15000, // 150.00 EGP
    'currency' => 'EGP',
    'customer' => [
        'phone' => '+201000000000',
        'full_name' => 'Tarek Mansour'
    ]
], 'idem_key_9482');

echo "Fawry Reference Code: " . $payment['next_action']['reference'];`,
  },
}

export function CodeTerminal() {
  const [activeTab, setActiveTab] = useState<keyof typeof snippets>("typescript")
  const [copied, setCopied] = useState(false)

  const active = snippets[activeTab]

  async function handleCopy() {
    await navigator.clipboard.writeText(active.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl transition-all">
      {/* Window Titlebar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-yellow-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{active.filename}</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1">
          {(Object.keys(snippets) as (keyof typeof snippets)[]).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                activeTab === tabKey
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {snippets[tabKey].name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code snippet"
            className="ml-2 rounded-md border border-border/60 bg-card p-1.5 text-muted-foreground hover:text-foreground transition-all"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="overflow-x-auto p-5 sm:p-6 font-mono text-xs leading-relaxed sm:text-sm text-foreground/90 bg-muted/10">
        <code>{active.code}</code>
      </pre>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-3 border-t border-border/60 bg-muted/20 text-center font-mono text-xs text-muted-foreground">
        <div className="border-r border-border/50 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
          201 CREATED
        </div>
        <div className="border-r border-border/50 py-2.5">12ms Latency</div>
        <div className="py-2.5">Zero Float Rounding</div>
      </div>
    </div>
  )
}
