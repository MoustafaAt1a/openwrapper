# OpenWrapper .NET Standalone Checkout Demo

A minimal, real-world checkout storefront and web API server powered by the official **OpenWrapper .NET SDK** (`OpenWrapper`).

---

## Getting Started

### 1. Run the .NET Checkout Server
From this directory:

```bash
dotnet run
```

Then open your browser at:
**[http://localhost:4002](http://localhost:4002)**

The .NET server provides:
- `/api/checkout` (POST) — Initiates real payments using `OpenWrapperClient.Payments.CreateAsync()`
- `/api/payment-status/{id}` (GET) — Polls resolution using `OpenWrapperClient.Payments.GetAsync()`
- `/api/health` (GET) — Diagnostic health status
- Static asset serving from `../public/`

---

### 2. Run the CLI Verification Script

To initiate a live payment directly from the command line:

```bash
dotnet run -- --cli
```

---

## .NET SDK Code Example

```csharp
using OpenWrapper;
using OpenWrapper.Models;

var options = new OpenWrapperClientOptions
{
    BaseUrl = "https://gateway.openwrapper.muejam.com",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
};

await using var client = new OpenWrapperClient(options);

// Convert decimal major currency amount to integer minor units (Invariant I1 - Zero Floating Point)
var amountMinorUnits = Money.ToMinorUnits(150.00m); // 15000 minor units

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob", // or "fawry", "stripe", "mock"
    AmountMinorUnits = amountMinorUnits,
    Currency = "EGP",
    Customer = new CustomerDetails
    {
        Phone = "+201001234567",
        Email = "customer@example.com",
        FullName = "Ahmed Ali",
    },
    MerchantReference = "order_1001",
    Description = ".NET Storefront Demo",
}, new RequestOptions { IdempotencyKey = "order_1001" });

// Format discrete integer minor units back to human display string (e.g. "150.00")
var displayAmount = Money.FormatMajorUnits(payment.AmountMinorUnits);
Console.WriteLine($"Payment ID: {payment.PaymentId} (Amount: {payment.Currency} {displayAmount}) [{payment.Status}]");

if (payment.NextAction?.Url is not null)
{
    Console.WriteLine($"Redirect: {payment.NextAction.Url}");
}
```
