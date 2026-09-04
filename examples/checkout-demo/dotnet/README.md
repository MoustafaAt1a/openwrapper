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
    BaseUrl = "http://localhost:3000/api",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
};

await using var client = new OpenWrapperClient(options);

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob", // or "fawry", "stripe"
    AmountMinorUnits = 15000, // EGP 150.00
    Currency = "EGP",
    Customer = new CustomerDetails
    {
        Phone = "+201001234567",
        Email = "customer@example.com",
        FullName = "Ahmed Ali",
    },
    MerchantReference = "order_1001",
    Description = ".NET Storefront Demo",
}, idempotencyKey: "order_1001");

Console.WriteLine($"Payment ID: {payment.PaymentId}");
if (payment.NextAction?.Url is not null)
{
    Console.WriteLine($"Redirect: {payment.NextAction.Url}");
}
```
