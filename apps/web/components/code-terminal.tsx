"use client"

import { CheckmarkCircle01Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

const snippets = {
  typescript: {
    lang: "typescript",
    name: "TypeScript",
    filename: "checkout.ts",
    code: `import { OpenWrapperClient } from "@openwrapper/sdk"

const client = new OpenWrapperClient({
  baseUrl: "https://api.openwrapper.dev",
  apiKey: process.env.OPENWRAPPER_KEY,
  providers: {
    stripe: { secretKey: process.env.STRIPE_SECRET_KEY },
    paymob: { secretKey: process.env.PAYMOB_SECRET_KEY },
    fawry: { secureKey: process.env.FAWRY_SECURE_KEY },
  },
})

// One unified call across Stripe, Paymob, or Fawry
const payment = await client.payments.create({
  provider: "stripe", // or "paymob" | "fawry"
  amountMinorUnits: 2499, // $24.99 (strictly integer minor units)
  currency: "USD",
  customer: {
    phone: "+15551234567",
    fullName: "Alex Smith",
    email: "alex@enterprise.com",
  },
  description: "Enterprise SaaS Subscription",
}, {
  idempotencyKey: "req_f829a1_2026",
})

// Lossless next-action inspection
console.log(payment.nextAction)
// => { type: "redirect_to_url", url: "https://checkout.stripe.com/c/pay/cs_live_..." }`,
  },
  dotnet: {
    lang: "csharp",
    name: ".NET 8",
    filename: "Program.cs",
    code: `using OpenWrapper;
using OpenWrapper.Models;
using OpenWrapper.Providers;

var options = new OpenWrapperClientOptions
{
    BaseUrl = "https://api.openwrapper.dev",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_KEY"),
    Providers = new ProviderCredentials
    {
        Stripe = new StripeCredentials { SecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") },
        Paymob = new PaymobCredentials { SecretKey = Environment.GetEnvironmentVariable("PAYMOB_SECRET_KEY") },
        Fawry = new FawryCredentials { SecureKey = Environment.GetEnvironmentVariable("FAWRY_SECURE_KEY") },
    }
};

await using var client = new OpenWrapperClient(options);
var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "stripe",
    AmountMinorUnits = 2499, // $24.99 USD
    Currency = "USD",
    Customer = new CustomerDetails { Phone = "+15551234567", Email = "alex@enterprise.com" },
    Description = "Enterprise SaaS Subscription"
}, new CreatePaymentOptions { IdempotencyKey = "req_f829a1_2026" });

Console.WriteLine($"Redirect URL: {payment.NextAction?.Url}");`,
  },
  php: {
    lang: "php",
    name: "PHP 8.1+",
    filename: "charge.php",
    code: `<?php
require_once __DIR__ . '/vendor/autoload.php';

use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: 'https://api.openwrapper.dev',
    apiKey: getenv('OPENWRAPPER_KEY'),
    providers: [
        'stripe' => ['secret_key' => getenv('STRIPE_SECRET_KEY')],
        'paymob' => ['secret_key' => getenv('PAYMOB_SECRET_KEY')],
        'fawry' => ['secure_key' => getenv('FAWRY_SECURE_KEY')],
    ]
);

$payment = $client->createPayment(
    new CreatePaymentParams(
        provider: 'stripe',
        amountMinorUnits: 2499, // $24.99 USD
        currency: 'USD',
        customer: new CustomerDetails(
            phone: '+15551234567',
            fullName: 'Alex Smith',
            email: 'alex@enterprise.com',
        ),
        description: 'Enterprise SaaS Subscription',
    ),
    idempotencyKey: 'req_f829a1_2026'
);

echo "Redirect URL: " . $payment->nextAction->url . "\\n";`,
  },
  curl: {
    lang: "bash",
    name: "cURL",
    filename: "request.sh",
    code: `curl -X POST https://api.openwrapper.dev/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENWRAPPER_KEY" \\
  -H "Idempotency-Key: req_f829a1_2026" \\
  -H "X-Stripe-Secret-Key: $STRIPE_SECRET_KEY" \\
  -d '{
    "provider": "stripe",
    "amount_minor_units": 2499,
    "currency": "USD",
    "customer": {
      "phone": "+15551234567",
      "full_name": "Alex Smith",
      "email": "alex@enterprise.com"
    },
    "description": "Enterprise SaaS Subscription"
  }'`,
  },
  python: {
    lang: "python",
    name: "Python",
    filename: "checkout.py",
    code: `import os
import requests

url = "https://api.openwrapper.dev/api/v1/payments"
headers = {
    "Authorization": f"Bearer {os.getenv('OPENWRAPPER_KEY')}",
    "Idempotency-Key": "req_f829a1_2026",
    "X-Stripe-Secret-Key": os.getenv("STRIPE_SECRET_KEY"),
    "Content-Type": "application/json"
}

payload = {
    "provider": "stripe",
    "amount_minor_units": 2499,
    "currency": "USD",
    "customer": {
        "phone": "+15551234567",
        "full_name": "Alex Smith",
        "email": "alex@enterprise.com"
    },
    "description": "Enterprise SaaS Subscription"
}

res = requests.post(url, json=payload, headers=headers)
print("Payment Created:", res.json())`,
  },
}

type TabKey = keyof typeof snippets

export function CodeTerminal() {
  const [activeTab, setActiveTab] = useState<TabKey>("typescript")
  const [copied, setCopied] = useState(false)

  const current = snippets[activeTab]

  function copyCode() {
    navigator.clipboard.writeText(current.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#1e2646] bg-[#0c1024] text-[#f6f9fc] shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
      {/* Top Bar with Window Controls, Filename, Tabs & Copy */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1e2646] bg-[#080b18] px-3 sm:px-4 py-2.5 gap-2.5">
        {/* Left: Window dots + filename + Copy on mobile */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 shrink-0">
              <span className="size-2.5 sm:size-3 rounded-full bg-[#ff5f56]" />
              <span className="size-2.5 sm:size-3 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.5 sm:size-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="ml-1.5 font-mono text-[11px] text-[#8ca3ba] truncate max-w-[140px] sm:max-w-none">
              {current.filename}
            </span>
          </div>

          {/* Copy button on mobile right */}
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy snippet code"
            className="sm:hidden flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#8ca3ba] hover:border-white/20 hover:text-white transition-all shrink-0"
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-400" />
            ) : (
              <HugeiconsIcon icon={Copy01Icon} size={14} />
            )}
            <span className="font-mono text-[10px]">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Right: Scrollable Tab Pills + Copy on sm+ */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar w-full sm:w-auto min-w-0 pb-0.5">
          {(Object.keys(snippets) as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-2.5 sm:px-3 py-1 font-mono text-[11px] sm:text-xs transition-all shrink-0 whitespace-nowrap ${
                activeTab === key
                  ? "bg-[#533afd] text-white font-semibold shadow-xs"
                  : "text-[#8ca3ba] hover:text-white hover:bg-white/5"
              }`}
            >
              {snippets[key].name}
            </button>
          ))}

          {/* Copy button on desktop */}
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy snippet code"
            className="hidden sm:flex ml-2 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#8ca3ba] hover:border-white/20 hover:text-white transition-all shrink-0"
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-400" />
            ) : (
              <HugeiconsIcon icon={Copy01Icon} size={14} />
            )}
            <span className="font-mono text-[11px]">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative w-full min-w-0 max-w-full overflow-x-auto p-3.5 sm:p-5 font-mono text-[11px] sm:text-xs leading-relaxed text-[#c2d1e0] select-all">
        <pre className="w-full min-w-0">
          <code>{current.code}</code>
        </pre>
      </div>

      {/* Terminal Footer Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-0 border-t border-[#1e2646] bg-[#080b18] px-3 sm:px-4 py-2 sm:py-2.5 text-center font-mono text-[10px] sm:text-[11px] text-[#8ca3ba]">
        <div className="sm:border-r border-[#1e2646]">
          <span className="text-emerald-400 font-semibold font-tnum">201 CREATED</span>
        </div>
        <div className="sm:border-r border-[#1e2646]">
          <span className="font-tnum">12ms Latency</span>
        </div>
        <div>
          <span className="text-[#8c82fc]">Zero Float Rounding</span>
        </div>
      </div>
    </div>
  )
}
