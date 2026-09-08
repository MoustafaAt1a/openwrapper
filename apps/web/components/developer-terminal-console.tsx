"use client"

import { CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"
import { CodeHighlighter } from "@/lib/code-syntax-highlighter"
import { GooTabs } from "@/components/ui/goo-tabs"

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
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card stripe-card-shadow-lg transition-all">
      {/* Authentic Mac Window Titlebar */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/80 px-4 py-2.5 select-none">
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

          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-border text-xs font-mono text-muted-foreground">
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
            <span className="font-medium text-foreground">{current.filename}</span>
          </div>
        </div>

        {/* Center/Right: Mac Segmented Tab Controls */}
        <div className="flex items-center gap-2">
          <GooTabs
            items={(Object.keys(SNIPPETS) as TabKey[]).map((key) => ({
              id: key,
              label: SNIPPETS[key].name,
            }))}
            activeId={activeTab}
            onTabChange={(id) => setActiveTab(id as TabKey)}
            className="bg-muted/80 border border-border/50 max-w-[280px] sm:max-w-none overflow-x-auto"
            indicatorClassName="bg-primary shadow-xs"
            size="sm"
          />

          {/* Copy Button */}
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy code to clipboard"
            className="flex items-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted px-2.5 py-1 text-xs text-foreground shadow-2xs transition-all cursor-pointer shrink-0"
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
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area with Mac Gutter Line Numbers & Real Prism Syntax Highlighting */}
      <div className="relative overflow-x-auto p-4 sm:p-5 font-mono text-[11.5px] sm:text-[12.5px] leading-relaxed text-foreground bg-card select-text">
        <CodeHighlighter code={current.code} language={current.lang} showLineNumbers={true} />
      </div>

      {/* Mac Terminal Footer Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-border bg-secondary/80 px-4 py-2 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>HTTP 201 Created</span>
          </span>
          <span className="text-border">|</span>
          <span className="font-tnum">11ms socket latency</span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-muted-foreground">
          <span>Strict minor units (i64)</span>
          <span className="text-border">|</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}

export const CodeTerminal = DeveloperTerminalConsole
export default DeveloperTerminalConsole
