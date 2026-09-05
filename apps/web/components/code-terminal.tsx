"use client"

import { Check, Copy } from "lucide-react"
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
            email: 'alex@enterprise.com',
            fullName: 'Alex Smith'
        ),
        description: 'Enterprise SaaS Subscription'
    )
);

echo "Next Action: " . ($payment->nextAction?->url ?? $payment->paymentId);`,
  },
  curl: {
    lang: "bash",
    name: "cURL",
    filename: "request.sh",
    code: `curl -X POST "https://api.openwrapper.dev/v1/payments" \\
  -H "Authorization: Bearer ow_live_secret_key_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: req_f829a1_2026" \\
  -H "X-Stripe-Secret-Key: sk_live_..." \\
  -d '{
    "provider": "stripe",
    "amount_minor_units": 2499,
    "currency": "USD",
    "customer": {
      "phone": "+15551234567",
      "email": "alex@enterprise.com",
      "full_name": "Alex Smith"
    },
    "description": "Enterprise SaaS Subscription"
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
    "X-Stripe-Secret-Key": os.getenv("STRIPE_SECRET_KEY"),
}
payload = {
    "provider": "stripe",
    "amount_minor_units": 2499,  # $24.99 USD
    "currency": "USD",
    "customer": {"email": "alex@enterprise.com", "phone": "+15551234567"},
    "description": "Enterprise SaaS Subscription",
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code, response.json())`,
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
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-yellow-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{active.filename}</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {(Object.keys(snippets) as (keyof typeof snippets)[]).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`rounded-md px-2.5 py-1 text-xs font-mono shrink-0 transition-all cursor-pointer ${
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
            className="ml-1 sm:ml-2 rounded-md border border-border/60 bg-card p-1.5 text-muted-foreground hover:text-foreground shrink-0 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="overflow-x-auto p-5 sm:p-6 font-mono text-xs leading-relaxed sm:text-sm text-foreground/90 bg-muted/10">
        <code>{active.code}</code>
      </pre>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-3 border-t border-border/60 bg-muted/20 text-center font-mono text-[10px] sm:text-xs text-muted-foreground">
        <div className="border-r border-border/50 py-2.5 px-1 truncate font-semibold text-emerald-600 dark:text-emerald-400">
          201 CREATED
        </div>
        <div className="border-r border-border/50 py-2.5 px-1 truncate">12ms Latency</div>
        <div className="py-2.5 px-1 truncate">Zero Float Rounding</div>
      </div>
    </div>
  )
}
