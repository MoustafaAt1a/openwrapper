# OpenWrapper .NET SDK

Production-ready .NET 8 / C# client for the **[OpenWrapper](https://github.com/MoustafaAt1a/openwrapper)** multi-rail payment gateway platform.

Version **0.2.7** — Feature parity with TypeScript and PHP clients.

## Install

Reference the package via NuGet:

```bash
dotnet add package OpenWrapper --version 0.2.7
```

---

## 30-Second Quickstart

```csharp
using OpenWrapper;
using OpenWrapper.Models;

// Automatically reads OPENWRAPPER_BASE_URL and OPENWRAPPER_API_KEY from environment:
await using var client = new OpenWrapperClient();

// 1. Create a payment
var payment = await client.CreatePaymentAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 10000, // 100.00 EGP
    Currency = "EGP",
    Customer = new CustomerDetails { Phone = "+201012345678" },
});

Console.WriteLine($"Payment created: {payment.PaymentId} [{payment.Status}]");
```

---

## Core Features

### 1. Issuing Full & Partial Refunds
```csharp
// Simple 1-line numeric refund:
var refund = await client.CreateRefundAsync(payment.PaymentId, 5000); // 50.00 EGP

// Or with optional reason and idempotency key:
var refundWithReason = await client.Refunds.CreateAsync(
    payment.PaymentId,
    amountMinorUnits: 5000,
    reason: "customer_requested",
    idempotencyKey: "ref-order-101-attempt-1");

// List all refunds for a payment:
var refunds = await client.ListRefundsAsync(payment.PaymentId);
```

### 2. Verifying Inbound Webhooks
Verify that incoming webhooks are authentic and prevent timing attacks:

```csharp
app.MapPost("/webhook", async (HttpRequest request) =>
{
    using var reader = new StreamReader(request.Body);
    var payload = await reader.ReadToEndAsync();
    var signature = request.Headers["X-OpenWrapper-Signature"].ToString();
    var secret = Environment.GetEnvironmentVariable("OPENWRAPPER_WEBHOOK_SECRET")!;

    if (!Webhooks.VerifySignature(payload, signature, secret))
    {
        return Results.Unauthorized();
    }

    // Process verified event...
    return Results.Ok();
});
```

### 3. Safe Currency Minor-Unit Calculations
Avoid floating-point arithmetic rounding errors:

```csharp
// Convert major currency to integer minor units:
long minor = Money.ToMinorUnits(25.99m); // 2599
long jpy = Money.ToMinorUnits(1500m, decimals: 0); // 1500 (zero-decimal)

// Format for display:
string display = Money.FormatMajorUnits(2599); // "25.99"
```

### 4. Querying the Immutable Events Ledger
```csharp
var events = await client.ListEventsAsync(new ListEventsParams { Limit = 10 });
foreach (var evt in events.Data)
{
    Console.WriteLine($"[{evt.EventType}] on {evt.ResourceId} at {evt.CreatedAt}");
}
```

---

## Client Configuration

```csharp
var options = new OpenWrapperClientOptions
{
    BaseUrl = "https://gateway-production.example.com",
    ApiKey = "ow_live_...",
    Providers = new ProviderCredentials
    {
        Paymob = new PaymobCredentials
        {
            SecretKey = Environment.GetEnvironmentVariable("PAYMOB_SECRET_KEY"),
            PublicKey = Environment.GetEnvironmentVariable("PAYMOB_PUBLIC_KEY"),
            HmacSecret = Environment.GetEnvironmentVariable("PAYMOB_HMAC_SECRET"),
            IntegrationId = "12345",
        },
        Fawry = new FawryCredentials
        {
            MerchantCode = Environment.GetEnvironmentVariable("FAWRY_MERCHANT_CODE"),
            SecureKey = Environment.GetEnvironmentVariable("FAWRY_SECURE_KEY"),
            BaseUrl = "https://atfawry.fawrystaging.com",
        },
        Stripe = new StripeCredentials
        {
            SecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY"),
        },
    },
};
```

## Dependency injection

Register with `IHttpClientFactory`:

```csharp
services.AddHttpClient<OpenWrapperClient>((sp, http) =>
{
    http.Timeout = TimeSpan.FromSeconds(30);
}).ConfigureHttpClient((sp, http) => { /* optional defaults */ });

// Factory registration:
services.AddSingleton(sp =>
{
    var factory = sp.GetRequiredService<IHttpClientFactory>();
    var http = factory.CreateClient(nameof(OpenWrapperClient));
    return new OpenWrapperClient(new OpenWrapperClientOptions
    {
        BaseUrl = configuration["OpenWrapper:BaseUrl"]!,
        ApiKey = configuration["OpenWrapper:ApiKey"],
    }, http);
});
```

## Error handling

Typed exceptions map to `error.code` from the gateway (`ValidationException`, `RateLimitException`, etc.). Connectivity failures throw `GatewayUnreachableException`, client-side deadlines throw `GatewayTimeoutException`, and caller cancellation remains an `OperationCanceledException` without being retried.

```csharp
try
{
    await client.Payments.CreateAsync(parameters);
}
catch (ValidationException ex)
{
    Console.WriteLine($"Invalid request: {ex.Message}");
}
catch (RateLimitException ex)
{
    Console.WriteLine($"Rate limited: {ex.Message}");
}
```

`CreateAsync` generates an idempotency key when omitted. For application-level
retries, supply a stable key. Transport retries are disabled by default; when
enabled, create retries reuse the same key and HTTP error responses are never
retried.

## Testing

```bash
cd sdk/dotnet
dotnet test OpenWrapper.sln
```

All tests use in-memory simulated HTTP handlers — no live API keys required.

## Environment variables

Copy `.env.example` to `.env` for local development:

```
OPENWRAPPER_API_KEY=ow_live_...
PAYMOB_SECRET_KEY=...
PAYMOB_PUBLIC_KEY=...
PAYMOB_HMAC_SECRET=...
FAWRY_MERCHANT_CODE=...
FAWRY_SECURE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
```
