"use client"

import { CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"
import { CodeHighlighter } from "@/lib/code-syntax-highlighter"

interface Snippet {
  lang: string
  name: string
  filename: string
  code: string
  highlightedLines?: number[]
}

const SNIPPETS: Record<string, Snippet> = {
  typescript: {
    lang: "typescript",
    name: "TypeScript",
    filename: "checkout.ts",
    code: `import { OpenWrapperClient, Money } from "@openwrapper/sdk"

// Zero-config: auto-resolves OPENWRAPPER_KEY & provider keys from env
const client = new OpenWrapperClient({
  baseUrl: "https://gateway.openwrapper.muejam.com",
  apiKey: process.env.OPENWRAPPER_KEY,
  providers: {
    paymob: { secretKey: process.env.PAYMOB_SECRET_KEY },
    fawry: { secureKey: process.env.FAWRY_SECURE_KEY },
    stripe: { secretKey: process.env.STRIPE_SECRET_KEY },
  },
})

// Single typed call across Paymob, Fawry, or Stripe
const payment = await client.payments.create({
  provider: "paymob", // or "fawry" | "stripe"
  amountMinorUnits: Money.toMinorUnits(250.00), // 25000 piasters (exact integer)
  currency: "EGP",
  customer: {
    phone: "+201012345678",
    fullName: "Nour El-Din",
    email: "nour@example.com",
  },
  description: "Annual Pro Plan",
}, {
  idempotencyKey: "req_ord_84920_paymob",
})

// Lossless next-action inspection for any rail
if (payment.nextAction?.type === "redirect_to_url") {
  console.log("Customer redirect:", payment.nextAction.url)
} else if (payment.nextAction?.type === "pay_at_reference") {
  console.log("Fawry Kiosk Code:", payment.nextAction.reference)
}`,
  },
  dotnet: {
    lang: "csharp",
    name: ".NET 8/9",
    filename: "CheckoutService.cs",
    code: `using OpenWrapper;
using OpenWrapper.Models;

// Strongly-typed client with native System.Text.Json source generators
var client = new OpenWrapperClient(new OpenWrapperClientOptions
{
    BaseUrl = "https://gateway.openwrapper.muejam.com",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_KEY"),
});

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 25000, // 250.00 EGP (strictly integer minor units)
    Currency = "EGP",
    Customer = new CustomerDetails
    {
        Phone = "+201012345678",
        FullName = "Nour El-Din",
        Email = "nour@example.com"
    },
    Description = "Annual Pro Plan"
}, new CreatePaymentOptions 
{ 
    IdempotencyKey = "req_ord_84920_paymob" 
});

Console.WriteLine($"Payment ID: {payment.Id}, Status: {payment.Status}");`,
  },
  php: {
    lang: "php",
    name: "PHP 8.1+",
    filename: "charge.php",
    code: `<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;
use OpenWrapper\\Money;

// PSR-18 / PSR-17 compliant client
$client = new OpenWrapperClient(
    baseUrl: 'https://gateway.openwrapper.muejam.com',
    apiKey: getenv('OPENWRAPPER_KEY'),
);

$payment = $client->payments->create(
    new CreatePaymentParams(
        provider: 'paymob',
        amountMinorUnits: Money::toMinorUnits(250.00), // 25000 piasters
        currency: 'EGP',
        customer: new CustomerDetails(
            phone: '+201012345678',
            fullName: 'Nour El-Din',
            email: 'nour@example.com',
        ),
        description: 'Annual Pro Plan',
    ),
    idempotencyKey: 'req_ord_84920_paymob'
);

echo "Payment created: " . $payment->id . " [" . $payment->status . "]\\n";`,
  },
  curl: {
    lang: "bash",
    name: "cURL",
    filename: "payment_request.sh",
    code: `curl -X POST https://gateway.openwrapper.muejam.com/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENWRAPPER_KEY" \\
  -H "Idempotency-Key: req_ord_84920_paymob" \\
  -H "X-Paymob-Secret-Key: $PAYMOB_SECRET_KEY" \\
  -d '{
    "provider": "paymob",
    "amount_minor_units": 25000,
    "currency": "EGP",
    "customer": {
      "phone": "+201012345678",
      "full_name": "Nour El-Din",
      "email": "nour@example.com"
    },
    "description": "Annual Pro Plan"
  }'`,
  },
  webhooks: {
    lang: "typescript",
    name: "Webhooks",
    filename: "webhook_handler.ts",
    code: `import { OpenWrapperClient } from "@openwrapper/sdk"

// Verify incoming upstream webhook signatures in constant time
export async function handleWebhook(req: Request) {
  const payload = await req.text()
  const signature = req.headers.get("x-openwrapper-signature") ?? ""
  const webhookSecret = process.env.OPENWRAPPER_WEBHOOK_SECRET!

  // Cryptographic constant-time HMAC-SHA256 verification
  const isValid = OpenWrapperClient.verifyWebhookSignature(
    payload,
    signature,
    webhookSecret
  )

  if (!isValid) {
    return new Response("Unauthorized", { status: 401 })
  }

  const event = JSON.parse(payload)
  console.log("Verified event:", event.type, event.data.payment_id)
  return new Response("OK", { status: 200 })
}`,
  },
}

type TabKey = keyof typeof SNIPPETS

export function DeveloperTerminalConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>("typescript")
  const [copied, setCopied] = useState(false)

  const current = SNIPPETS[activeTab]

  function copyCode() {
    navigator.clipboard.writeText(current.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#d2d2d7] dark:border-[#2d3139] bg-white dark:bg-[#141418] shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] transition-all">
      {/* Authentic Mac Window Titlebar */}
      <div className="flex items-center justify-between border-b border-[#e5e5e7] dark:border-[#2b2b32] bg-[#f6f6f6] dark:bg-[#1e1e24] px-4 py-2.5 select-none">
        {/* Left: macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 group cursor-pointer"
            title="macOS Window Controls"
          >
            <span className="size-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/80 transition-opacity hover:opacity-80" />
            <span className="size-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/80 transition-opacity hover:opacity-80" />
            <span className="size-3 rounded-full bg-[#27c93f] border border-[#1aab29]/80 transition-opacity hover:opacity-80" />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-[#e5e5e7] dark:border-[#2b2b32] text-xs font-mono text-[#6e6e73] dark:text-[#8b949e]">
            <svg
              className="size-3.5 opacity-70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-medium text-[#1d1d1f] dark:text-[#e6edf3]">
              {current.filename}
            </span>
          </div>
        </div>

        {/* Center/Right: Mac Segmented Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-[#e8e8ed] dark:bg-[#2c2d38] border border-black/5 dark:border-white/5 overflow-x-auto max-w-[280px] sm:max-w-none">
            {(Object.keys(SNIPPETS) as TabKey[]).map((key) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-[#3e4052] text-[#1d1d1f] dark:text-white shadow-xs font-semibold"
                      : "text-[#6e6e73] dark:text-[#98989f] hover:text-[#1d1d1f] dark:hover:text-white"
                  }`}
                >
                  {SNIPPETS[key].name}
                </button>
              )
            })}
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy code to clipboard"
            className="flex items-center gap-1.5 rounded-md border border-[#d2d2d7] dark:border-[#3a3a46] bg-white dark:bg-[#2c2d38] hover:bg-[#f6f6f6] dark:hover:bg-[#363746] px-2.5 py-1 text-xs text-[#1d1d1f] dark:text-[#e6edf3] shadow-2xs transition-all cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Copied
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#98989f]" />
                <span className="text-[11px] font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area with Mac Gutter Line Numbers & Real Prism Syntax Highlighting */}
      <div className="relative overflow-x-auto p-4 sm:p-5 font-mono text-[11.5px] sm:text-[12.5px] leading-relaxed text-[#24292f] dark:text-[#c9d1d9] bg-[#ffffff] dark:bg-[#0f111a] select-text">
        <CodeHighlighter code={current.code} language={current.lang} showLineNumbers={true} />
      </div>

      {/* Mac Terminal Footer Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-[#e5e5e7] dark:border-[#2b2b32] bg-[#fbfbfd] dark:bg-[#181a24] px-4 py-2 text-[11px] font-mono text-[#6e6e73] dark:text-[#8b949e]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>HTTP 201 Created</span>
          </span>
          <span className="text-[#d2d2d7] dark:text-[#3a3a46]">|</span>
          <span>11ms socket latency</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[#6e6e73] dark:text-[#8b949e]">
          <span>Strict minor units (i64)</span>
          <span className="text-[#d2d2d7] dark:text-[#3a3a46]">|</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}

export const CodeTerminal = DeveloperTerminalConsole
export default DeveloperTerminalConsole
