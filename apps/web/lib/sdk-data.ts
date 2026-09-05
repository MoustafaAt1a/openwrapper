export interface SdkRecipe {
  title: string
  description: string
  provider: "paymob" | "fawry" | "stripe"
  code: string
}

export interface SdkDoc {
  id: "typescript" | "php" | "dotnet"
  name: string
  shortName: string
  ecosystem: string
  package: string
  version: string
  description: string
  badgeText: string
  installCommand: string
  installAlternatives: { label: string; command: string }[]
  requirements: string[]
  features: string[]
  quickstart: {
    title: string
    description: string
    code: string
  }
  recipes: SdkRecipe[]
  statusCheck: {
    title: string
    description: string
    code: string
  }
  webhooks: {
    title: string
    description: string
    code: string
  }
  bestPractices: {
    title: string
    description: string
  }[]
}

export const SDK_DOCS: Record<"typescript" | "php" | "dotnet", SdkDoc> = {
  typescript: {
    id: "typescript",
    name: "TypeScript / Node.js SDK",
    shortName: "TypeScript",
    ecosystem: "Node.js 18+ • Bun • Deno • Browser",
    package: "@openwrapper/sdk",
    version: "0.1.3",
    description:
      "Official zero-dependency TypeScript and JavaScript SDK for OpenWrapper. Built on native Web fetch with automatic idempotency key handling, exponential backoff retries, and strict minor-unit monetary math.",
    badgeText: "Official • TypeScript & Bun",
    installCommand: "npm install @openwrapper/sdk",
    installAlternatives: [
      { label: "Bun", command: "bun add @openwrapper/sdk" },
      { label: "pnpm", command: "pnpm add @openwrapper/sdk" },
      { label: "Yarn", command: "yarn add @openwrapper/sdk" },
    ],
    requirements: [
      "Node.js 18.0.0 or higher (or Bun 1.0+, Deno 1.35+, or modern browser)",
      "Native global fetch API available in runtime",
      "TypeScript 5.0+ recommended for strict parameter inference",
    ],
    features: [
      "Zero external dependencies (uses native runtime fetch)",
      "Automatic idempotency UUID generation if not provided",
      "Stateless Zero-Knowledge Mode (headers) or ambient gateway credentials",
      "Strict integer minor-unit amount enforcement (no floating point errors)",
      "Configurable retry with jittered exponential backoff for network blips",
    ],
    quickstart: {
      title: "1. Initialize the OpenWrapper Client",
      description:
        "Point baseUrl to the high-performance Rust Gateway or the Web Control Plane. Pass your API key or merchant provider credentials.",
      code: `import { OpenWrapperClient } from "@openwrapper/sdk";

// Initialize client (Stateless Zero-Knowledge mode)
const client = new OpenWrapperClient({
  // Direct high-performance Rust Gateway:
  baseUrl: process.env.OPENWRAPPER_BASE_URL || "https://gateway.openwrapper.muejam.com",
  // Or Web Control Plane API (persists transactions to Dashboard):
  // baseUrl: "https://openwrapper.muejam.com/api",
  
  apiKey: process.env.OPENWRAPPER_API_KEY, // e.g. "ow_live_..."
  
  // Optional: merchant credentials sent per-request over TLS headers:
  providers: {
    paymob: {
      secretKey: process.env.PAYMOB_SECRET_KEY,
      publicKey: process.env.PAYMOB_PUBLIC_KEY,
      hmacSecret: process.env.PAYMOB_HMAC_SECRET,
      integrationId: process.env.PAYMOB_INTEGRATION_ID,
    },
    fawry: {
      merchantCode: process.env.FAWRY_MERCHANT_CODE,
      secureKey: process.env.FAWRY_SECURE_KEY,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  },
  timeoutMs: 30000,
  maxRetries: 2,
});`,
    },
    recipes: [
      {
        title: "Paymob 3DS Credit / Debit Card (Visa, Mastercard, Meeza)",
        description:
          "Charges an Egyptian or international card. Returns requires_action with a secure 3DS OTP redirect URL.",
        provider: "paymob",
        code: `const payment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 25000, // 250.00 EGP (always in minor integer units)
  currency: "EGP",
  merchantReference: "order_1001",
  customer: {
    phone: "+201012345678",
    email: "customer@example.com",
    fullName: "Omar Tarek",
  },
});

// Check if customer needs to authorize 3DS OTP:
if (payment.status === "requires_action" && payment.nextAction?.url) {
  // Redirect customer browser to Paymob 3DS iframe:
  console.log("Redirect URL:", payment.nextAction.url);
} else {
  console.log("Payment status:", payment.status);
}`,
      },
      {
        title: "Paymob Egyptian Mobile Wallet (Vodafone Cash, InstaPay, Orange, Etisalat)",
        description:
          "Debits funds directly from Egyptian mobile wallets using the customer's phone number.",
        provider: "paymob",
        code: `const walletPayment = await client.payments.create({
  provider: "paymob",
  amountMinorUnits: 15000, // 150.00 EGP
  currency: "EGP",
  merchantReference: "wallet_order_204",
  customer: {
    phone: "+201010000000", // Customer wallet number
  },
});

console.log("Wallet payment ID:", walletPayment.paymentId);
console.log("Status:", walletPayment.status);`,
      },
      {
        title: "Fawry Pay-at-Reference (Retail Kiosk Cash Voucher)",
        description:
          "Generates a 9-digit reference voucher code payable in cash at any Fawry retail kiosk or Aman store in Egypt.",
        provider: "fawry",
        code: `const kioskPayment = await client.payments.create({
  provider: "fawry",
  amountMinorUnits: 30000, // 300.00 EGP
  currency: "EGP",
  merchantReference: "fawry_ref_991",
  customer: {
    phone: "+201012345678",
    email: "buyer@example.com",
    fullName: "Ahmed Hassan",
  },
});

// Extract the 9-digit kiosk payment code to display to customer:
const kioskCode = kioskPayment.nextAction?.reference; // e.g. "929113250"
console.log("Show this code to cashier at Fawry:", kioskCode);`,
      },
      {
        title: "Stripe International Cards & Apple Pay / Google Pay",
        description:
          "Creates a global card payment or hosted Stripe Checkout session for multi-currency transactions.",
        provider: "stripe",
        code: `const stripePayment = await client.payments.create({
  provider: "stripe",
  amountMinorUnits: 5000, // $50.00 USD
  currency: "USD",
  merchantReference: "intl_ord_771",
  customer: {
    email: "customer@global.com",
  },
});

if (stripePayment.nextAction?.url) {
  // Redirect to Stripe Hosted Checkout
  console.log("Stripe Checkout URL:", stripePayment.nextAction.url);
}`,
      },
    ],
    statusCheck: {
      title: "Poll or Retrieve Payment Status",
      description: "Query any payment by ID to inspect terminal settlement status.",
      code: `// Fetch current state from gateway
const payment = await client.payments.get("pay_01hxyz123");

console.log("Payment status:", payment.status); // "pending" | "succeeded" | "failed"
console.log("Settled minor units:", payment.amountMinorUnits);
console.log("Provider Reference:", payment.providerReference);`,
    },
    webhooks: {
      title: "Handle Inbound Webhooks in Node / Next.js",
      description:
        "OpenWrapper webhooks send standardized transaction callbacks. Paymob and Fawry cryptographic signatures are verified automatically.",
      code: `// In your Next.js route: app/api/webhooks/paymob/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();
  const hmac = req.headers.get("x-paymob-hmac");

  // OpenWrapper automatically verifies and updates states
  // State transitions: pending -> succeeded or failed
  console.log("Transaction ID:", payload.obj?.id);
  console.log("Success:", payload.obj?.success);

  return NextResponse.json({ received: true });
}`,
    },
    bestPractices: [
      {
        title: "Always Use Minor Units (No Decimals)",
        description:
          "Never pass floating-point numbers like 99.99. Always pass integers: 9999 for 99.99 EGP or USD. This eliminates roundoff errors.",
      },
      {
        title: "Reuse Stable Idempotency Keys on Retries",
        description:
          "Pass your own stable business order ID (e.g. idempotencyKey: 'order_1001') so network retries never double-charge customers.",
      },
      {
        title: "Stateless Zero-Knowledge Mode",
        description:
          "You do not need to store your Paymob or Stripe secret keys in the OpenWrapper database; pass them in the client constructor per-request over TLS.",
      },
    ],
  },

  php: {
    id: "php",
    name: "PHP 8.1+ SDK",
    shortName: "PHP",
    ecosystem: "PHP 8.1+ • Composer • Laravel • Symfony • WordPress",
    package: "openwrapper/sdk",
    version: "0.1.3",
    description:
      "Official, modern PHP client for OpenWrapper with native PHP 8.1+ typed properties, PSR-18/PSR-17 compatibility, and defensive null-safe wire parsing.",
    badgeText: "Official • PSR-18 & PHP 8.1+",
    installCommand: "composer require openwrapper/sdk",
    installAlternatives: [
      { label: "Composer (Specific Version)", command: "composer require openwrapper/sdk:0.1.3" },
      {
        label: "Manual (Clone src)",
        command: "git clone https://github.com/MoustafaAt1a/openwrapper.git",
      },
    ],
    requirements: [
      "PHP 8.1.0 or higher",
      "ext-curl (for high-speed HTTP transport)",
      "ext-json (for payload serialization)",
      "Compatible with Laravel 10/11, Symfony 6/7, and standard modern PHP frameworks",
    ],
    features: [
      "Strict PHP 8.1 typed classes and readonly data transfer objects (DTOs)",
      "PSR-18 / PSR-17 compliant with native CurlHttpTransport fallback",
      "Stateless encrypted TLS headers for Paymob, Fawry, and Stripe",
      "Strict integer minor-unit amount enforcement",
      "Comprehensive exception hierarchy (AuthenticationException, ValidationException, etc.)",
    ],
    quickstart: {
      title: "1. Initialize the OpenWrapper Client",
      description:
        "Import the OpenWrapper namespace and instantiate OpenWrapperClient with your gateway URL and credentials.",
      code: `<?php
require_once 'vendor/autoload.php';

use OpenWrapper\\OpenWrapperClient;
use OpenWrapper\\CreatePaymentParams;
use OpenWrapper\\CustomerDetails;

// Initialize client with gateway URL and optional stateless credentials
$client = new OpenWrapperClient(
    baseUrl: getenv('OPENWRAPPER_BASE_URL') ?: 'https://gateway.openwrapper.muejam.com',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
    providers: [
        'paymob' => [
            'secret_key' => getenv('PAYMOB_SECRET_KEY'),
            'public_key' => getenv('PAYMOB_PUBLIC_KEY'),
            'hmac_secret' => getenv('PAYMOB_HMAC_SECRET'),
            'integration_id' => getenv('PAYMOB_INTEGRATION_ID'),
        ],
        'fawry' => [
            'merchant_code' => getenv('FAWRY_MERCHANT_CODE'),
            'secure_key' => getenv('FAWRY_SECURE_KEY'),
        ],
        'stripe' => [
            'secret_key' => getenv('STRIPE_SECRET_KEY'),
        ],
    ]
);`,
    },
    recipes: [
      {
        title: "Paymob 3DS Credit / Debit Card (Visa, Mastercard, Meeza)",
        description: "Authorizes Egyptian cards and Meeza debit. Handles 3DS OTP redirection.",
        provider: "paymob",
        code: `<?php
$payment = $client->createPayment(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 25000, // 250.00 EGP (Integer minor units)
    currency: 'EGP',
    merchantReference: 'php_order_1001',
    customer: new CustomerDetails(
        phone: '+201012345678',
        email: 'customer@example.com',
        fullName: 'Omar Tarek'
    )
));

// Check if buyer needs to complete 3DS authentication:
if ($payment->status === 'requires_action' && $payment->nextAction?->url) {
    // Redirect customer browser:
    header('Location: ' . $payment->nextAction->url);
    exit;
}

echo "Payment status: " . $payment->status;`,
      },
      {
        title: "Paymob Egyptian Mobile Wallet (Vodafone / Orange / Etisalat / WE)",
        description: "Debits an Egyptian mobile wallet balance directly via customer phone number.",
        provider: "paymob",
        code: `<?php
$walletPayment = $client->createPayment(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 15000, // 150.00 EGP
    currency: 'EGP',
    merchantReference: 'php_wallet_505',
    customer: new CustomerDetails(
        phone: '+201010000000' // Vodafone Cash / InstaPay phone
    )
));

echo "Wallet Payment ID: " . $walletPayment->paymentId;
echo "Status: " . $walletPayment->status;`,
      },
      {
        title: "Fawry Pay-at-Reference (Cash at Retail Kiosk)",
        description:
          "Generates a 9-digit reference number for cash payment at Fawry POS terminals in Egypt.",
        provider: "fawry",
        code: `<?php
$fawryPayment = $client->createPayment(new CreatePaymentParams(
    provider: 'fawry',
    amountMinorUnits: 30000, // 300.00 EGP
    currency: 'EGP',
    merchantReference: 'fawry_voucher_10',
    customer: new CustomerDetails(
        phone: '+201012345678',
        fullName: 'Ahmed Hassan'
    )
));

// Display 9-digit reference code to customer:
$kioskCode = $fawryPayment->nextAction?->reference; // e.g. "929113250"
echo "Please pay at any Fawry retail outlet with reference code: " . $kioskCode;`,
      },
      {
        title: "Stripe International Checkout",
        description: "Creates a hosted Stripe session for global cards, Apple Pay, and Google Pay.",
        provider: "stripe",
        code: `<?php
$stripePayment = $client->createPayment(new CreatePaymentParams(
    provider: 'stripe',
    amountMinorUnits: 5000, // $50.00 USD
    currency: 'USD',
    merchantReference: 'stripe_php_88',
    customer: new CustomerDetails(
        email: 'customer@global.com'
    )
));

if ($stripePayment->nextAction?->url) {
    header('Location: ' . $stripePayment->nextAction->url);
    exit;
}`,
      },
    ],
    statusCheck: {
      title: "Query Payment Status by ID",
      description: "Check transaction resolution using paymentId.",
      code: `<?php
$payment = $client->getPayment('pay_01hxyz123');

echo "Current Status: " . $payment->status; // 'pending', 'succeeded', 'failed'
echo "Provider Ref: " . $payment->providerReference;`,
    },
    webhooks: {
      title: "Handle Inbound Webhooks in PHP / Laravel",
      description: "Receive real-time state updates from OpenWrapper.",
      code: `<?php
// In public/webhook.php or Laravel route:
$payload = json_decode(file_get_contents('php://input'), true);

$provider = $payload['provider'] ?? 'paymob';
$status = $payload['status'] ?? 'pending';
$paymentId = $payload['id'] ?? null;

// Update your database order record:
if ($status === 'succeeded') {
    // Fulfill customer order
}

http_response_code(200);
echo json_encode(['received' => true]);`,
    },
    bestPractices: [
      {
        title: "No Floating-Point Math",
        description:
          "In PHP, (int) round($amountInEgp * 100) must be used. Never pass floating-point numbers to amountMinorUnits.",
      },
      {
        title: "Defensive Exception Catching",
        description:
          "Catch OpenWrapper\\Exceptions\\OpenWrapperException to handle network timeouts or authorization issues gracefully.",
      },
      {
        title: "Dependency Injection in Laravel / Symfony",
        description:
          "Register OpenWrapperClient in your AppServiceProvider as a singleton to reuse cURL connections efficiently.",
      },
    ],
  },

  dotnet: {
    id: "dotnet",
    name: ".NET 8 / C# SDK",
    shortName: ".NET",
    ecosystem: ".NET 8.0 • .NET 9.0 • ASP.NET Core • C# 12+",
    package: "OpenWrapper",
    version: "0.1.3",
    description:
      "Official high-performance .NET 8 client for OpenWrapper. Built with System.Text.Json source generation, nullable reference types, and HttpClientFactory integration.",
    badgeText: "Official • .NET 8 / NuGet",
    installCommand: "dotnet add package OpenWrapper --version 0.1.3",
    installAlternatives: [
      { label: "Package Manager Console", command: "Install-Package OpenWrapper -Version 0.1.3" },
      {
        label: "PackageReference XML",
        command: '<PackageReference Include="OpenWrapper" Version="0.1.3" />',
      },
    ],
    requirements: [
      ".NET 8.0 SDK or .NET 9.0 SDK",
      "C# 12 or higher with nullable reference types enabled",
      "Native support for ASP.NET Core Dependency Injection and IHttpClientFactory",
    ],
    features: [
      "Modern async/await with Task-based asynchronous pattern",
      "Zero allocations on JSON serialization via System.Text.Json source generators",
      "Strongly typed models for Paymob, Fawry, and Stripe",
      "Stateless encrypted header injection for provider credentials",
      "Automatic handling of idempotency and exponential retry backoff",
    ],
    quickstart: {
      title: "1. Initialize the OpenWrapper Client",
      description:
        "Instantiate OpenWrapperClient with OpenWrapperClientOptions or register it into your ASP.NET Core DI container.",
      code: `using OpenWrapper;
using OpenWrapper.Models;

// Configure client options
var options = new OpenWrapperClientOptions
{
    // High-performance Rust Gateway:
    BaseUrl = "https://gateway.openwrapper.muejam.com",
    // Or Web Control Plane API:
    // BaseUrl = "https://openwrapper.muejam.com/api",
    
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
    Providers = new ProviderCredentials
    {
        Paymob = new PaymobCredentials
        {
            SecretKey = Environment.GetEnvironmentVariable("PAYMOB_SECRET_KEY"),
            PublicKey = Environment.GetEnvironmentVariable("PAYMOB_PUBLIC_KEY"),
            HmacSecret = Environment.GetEnvironmentVariable("PAYMOB_HMAC_SECRET"),
            IntegrationId = "5360584",
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

await using var client = new OpenWrapperClient(options);`,
    },
    recipes: [
      {
        title: "Paymob 3DS Credit / Debit Card (Visa, Mastercard, Meeza)",
        description: "Executes card payments and directs the user to the 3DS authorization page.",
        provider: "paymob",
        code: `var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 25000, // 250.00 EGP (Integer minor units)
    Currency = "EGP",
    MerchantReference = "dotnet_order_1001",
    Customer = new CustomerDetails
    {
        Phone = "+201012345678",
        Email = "buyer@example.com",
        FullName = "Omar Tarek",
    },
});

if (payment.Status == "requires_action" && payment.NextAction?.Url != null)
{
    // Redirect buyer to 3DS authentication URL
    Console.WriteLine($"Redirect customer to: {payment.NextAction.Url}");
}
else
{
    Console.WriteLine($"Payment ID: {payment.PaymentId}, Status: {payment.Status}");
}`,
      },
      {
        title: "Paymob Egyptian Mobile Wallet (Vodafone / Orange / Etisalat / WE)",
        description: "Direct debit from an Egyptian mobile wallet account.",
        provider: "paymob",
        code: `var walletPayment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 15000, // 150.00 EGP
    Currency = "EGP",
    MerchantReference = "dotnet_wallet_50",
    Customer = new CustomerDetails
    {
        Phone = "+201010000000", // Egyptian wallet phone number
    },
});

Console.WriteLine($"Wallet Payment Status: {walletPayment.Status}");`,
      },
      {
        title: "Fawry Pay-at-Reference (Retail Kiosk Cash Voucher)",
        description: "Generates a 9-digit kiosk code for cash settlement at retail stores.",
        provider: "fawry",
        code: `var fawryPayment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "fawry",
    AmountMinorUnits = 30000, // 300.00 EGP
    Currency = "EGP",
    MerchantReference = "fawry_dotnet_20",
    Customer = new CustomerDetails
    {
        Phone = "+201012345678",
        FullName = "Ahmed Hassan",
    },
});

// Extract kiosk code to display to customer:
string? kioskCode = fawryPayment.NextAction?.Reference; // e.g. "929113250"
Console.WriteLine($"Fawry Kiosk Reference Code: {kioskCode}");`,
      },
      {
        title: "Stripe International Cards & Apple Pay / Google Pay",
        description: "Creates a hosted Stripe session for global cards.",
        provider: "stripe",
        code: `var stripePayment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "stripe",
    AmountMinorUnits = 5000, // $50.00 USD
    Currency = "USD",
    MerchantReference = "stripe_dotnet_9",
    Customer = new CustomerDetails
    {
        Email = "customer@global.com",
    },
});

if (stripePayment.NextAction?.Url != null)
{
    Console.WriteLine($"Stripe Checkout URL: {stripePayment.NextAction.Url}");
}`,
      },
    ],
    statusCheck: {
      title: "Query Payment Status by ID",
      description: "Retrieve latest transaction state using Payments.GetAsync.",
      code: `var payment = await client.Payments.GetAsync("pay_01hxyz123");

Console.WriteLine($"Status: {payment.Status}");
Console.WriteLine($"Amount (minor): {payment.AmountMinorUnits}");
Console.WriteLine($"Provider Ref: {payment.ProviderReference}");`,
    },
    webhooks: {
      title: "Handle Inbound Webhooks in ASP.NET Core Minimal API",
      description: "Receive and process webhook callbacks with C#.",
      code: `// In Program.cs (ASP.NET Core Minimal API):
app.MapPost("/webhooks/openwrapper", async (HttpContext context) =>
{
    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();
    
    // Parse webhook payload
    var payload = System.Text.Json.JsonDocument.Parse(body);
    var status = payload.RootElement.GetProperty("status").GetString();
    var paymentId = payload.RootElement.GetProperty("id").GetString();

    if (status == "succeeded")
    {
        // Fulfill order
    }

    return Results.Ok(new { received = true });
});`,
    },
    bestPractices: [
      {
        title: "Integer Minor Units",
        description:
          "Always use long or int minor units. For 125.50 EGP, pass 12550 to AmountMinorUnits. Never use double or decimal.",
      },
      {
        title: "ASP.NET Core Dependency Injection",
        description:
          "Register OpenWrapperClient as a singleton (builder.Services.AddSingleton<OpenWrapperClient>()) to take advantage of pooled HTTP connections.",
      },
      {
        title: "Deterministic Idempotency",
        description:
          "Pass your stable internal order ID in IdempotencyKey when retrying requests to avoid charging customers twice.",
      },
    ],
  },
}
