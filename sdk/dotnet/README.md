# OpenWrapper .NET SDK

Production-ready .NET 8 client for the [OpenWrapper](https://github.com/MoustafaAt1a/openwrapper) payment gateway API.

Version **0.1.2** — mirrors the TypeScript and PHP clients.

## Install

Reference the project from this repository:

```bash
dotnet add package OpenWrapper --version 0.1.2
# or add a ProjectReference to sdk/dotnet/src/OpenWrapper/OpenWrapper.csproj
```

## Quick start (local gateway)

```csharp
using OpenWrapper;
using OpenWrapper.Models;

var options = new OpenWrapperClientOptions
{
    BaseUrl = "http://localhost:8080",
    ApiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY"),
};

await using var client = new OpenWrapperClient(options);

var payment = await client.Payments.CreateAsync(new CreatePaymentParams
{
    Provider = "paymob",
    AmountMinorUnits = 10000,
    Currency = "EGP",
    Customer = new CustomerDetails
    {
        Phone = "+201234567890",
        Email = "buyer@example.com",
        FullName = "Ahmed Hassan",
    },
    MerchantReference = "order-123",
});

Console.WriteLine(payment.NextAction?.Url ?? payment.PaymentId);
```

## Web proxy (Railway / Next.js)

Point `BaseUrl` at your deployed web app API root:

```csharp
BaseUrl = "https://your-app.up.railway.app/api"
```

The SDK appends `/v1` paths. For compatibility, a URL already ending in `/v1`
is accepted without duplicating the version segment.

## Stateless mode (provider credentials via headers)

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

All tests use mocked HTTP — no live API keys required.

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
