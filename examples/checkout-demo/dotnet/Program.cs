using System.Text.Json.Serialization;
using Microsoft.Extensions.FileProviders;
using OpenWrapper;
using OpenWrapper.Exceptions;
using OpenWrapper.Models;
using OpenWrapper.Providers;

// 1. Load Environment Variables from .env files
LoadEnvFile(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".env"));
LoadEnvFile(Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"));
LoadEnvFile(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

static void LoadEnvFile(string path)
{
    var fullPath = Path.GetFullPath(path);
    if (!File.Exists(fullPath)) return;
    foreach (var line in File.ReadAllLines(fullPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var idx = trimmed.IndexOf('=');
        if (idx > 0)
        {
            var key = trimmed[..idx].Trim();
            var val = trimmed[(idx + 1)..].Trim();
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, val);
            }
        }
    }
}

// 2. Client Factory
static OpenWrapperClient CreateClient()
{
    var baseUrl = Environment.GetEnvironmentVariable("OPENWRAPPER_BASE_URL") ?? "http://localhost:3000/api";
    var apiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY");

    var options = new OpenWrapperClientOptions
    {
        BaseUrl = baseUrl,
        ApiKey = apiKey,
        Providers = new ProviderCredentials
        {
            Paymob = new PaymobCredentials
            {
                SecretKey = Environment.GetEnvironmentVariable("PAYMOB_SECRET_KEY"),
                PublicKey = Environment.GetEnvironmentVariable("PAYMOB_PUBLIC_KEY"),
                HmacSecret = Environment.GetEnvironmentVariable("PAYMOB_HMAC_SECRET"),
                IntegrationId = Environment.GetEnvironmentVariable("PAYMOB_INTEGRATION_ID"),
                BaseUrl = Environment.GetEnvironmentVariable("PAYMOB_BASE_URL"),
            },
            Fawry = new FawryCredentials
            {
                MerchantCode = Environment.GetEnvironmentVariable("FAWRY_MERCHANT_CODE"),
                SecureKey = Environment.GetEnvironmentVariable("FAWRY_SECURE_KEY"),
                BaseUrl = Environment.GetEnvironmentVariable("FAWRY_BASE_URL"),
            },
            Stripe = new StripeCredentials
            {
                SecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY"),
            },
        },
        Timeout = TimeSpan.FromSeconds(20),
    };

    return new OpenWrapperClient(options);
}

// 3. CLI Mode Runner
if (args.Contains("--cli"))
{
    Console.WriteLine("\n=======================================================");
    Console.WriteLine("  OpenWrapper .NET SDK (v0.1.2) - Real Transaction Test");
    Console.WriteLine("=======================================================");

    var baseUrl = Environment.GetEnvironmentVariable("OPENWRAPPER_BASE_URL") ?? "http://localhost:3000/api";
    var apiKey = Environment.GetEnvironmentVariable("OPENWRAPPER_API_KEY");
    var provider = Environment.GetEnvironmentVariable("OPENWRAPPER_TEST_PROVIDER") ?? "paymob";
    var orderRef = $"cli_dotnet_{Guid.NewGuid():N}"[..18];

    Console.WriteLine($"Target Base URL: {baseUrl}");
    Console.WriteLine($"API Key        : {(string.IsNullOrEmpty(apiKey) ? "(unset/stateless)" : apiKey[..Math.Min(10, apiKey.Length)] + "...")}\n");
    Console.WriteLine($"[1/2] Initiating {provider} payment of EGP 150.00 (order: {orderRef})...");

    try
    {
        await using var client = CreateClient();
        var payment = await client.Payments.CreateAsync(new CreatePaymentParams
        {
            Provider = provider,
            AmountMinorUnits = 15000,
            Currency = "EGP",
            Customer = new CustomerDetails
            {
                Phone = "+201001234567",
                Email = "dotnet-tester@example.com",
                FullName = ".NET CLI Tester",
            },
            MerchantReference = orderRef,
            Description = ".NET Live Storefront CLI Test",
        }, idempotencyKey: orderRef);

        Console.WriteLine($"  -> Payment ID : {payment.PaymentId}");
        Console.WriteLine($"  -> Status     : {payment.Status}");
        Console.WriteLine($"  -> Amount     : EGP {payment.AmountMinorUnits / 100.0:F2}");

        if (payment.NextAction is not null)
        {
            Console.WriteLine($"  -> Next Action: {payment.NextAction.Type}");
            if (!string.IsNullOrEmpty(payment.NextAction.Url))
                Console.WriteLine($"     Checkout URL: {payment.NextAction.Url}");
            if (!string.IsNullOrEmpty(payment.NextAction.Reference))
                Console.WriteLine($"     Kiosk Code  : {payment.NextAction.Reference}");
        }

        Console.WriteLine("\n[2/2] Polling payment resolution via client.Payments.GetAsync()...");
        var fetched = await client.Payments.GetAsync(payment.PaymentId);
        Console.WriteLine($"  -> Verified Status: {fetched.Status}");
        Console.WriteLine($"  -> Provider Ref   : {fetched.ProviderReference ?? "N/A"}");

        Console.WriteLine("\n✔ SUCCESS: .NET SDK transaction completed and verified cleanly.\n");
        return 0;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"\n✖ ERROR: Transaction failed: {ex.Message}\n");
        return 1;
    }
}

// 4. Web Server Mode (Port 4002)
var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:4002");
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors();

// Static files from ../public
var publicPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "public"));
if (Directory.Exists(publicPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(publicPath)
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(publicPath)
    });
}

// Products
var products = new Dictionary<string, (string Name, long AmountMinor, string Currency)>
{
    ["starter"] = ("Starter Developer Tier", 5000, "EGP"),
    ["pro"] = ("OpenWrapper Pro Plan", 15000, "EGP"),
    ["enterprise"] = ("Enterprise Gateway License", 45000, "EGP"),
};

// Health
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    sdk = "dotnet",
    runtime = $".NET {Environment.Version}",
    version = "0.1.2",
    server = "OpenWrapper .NET Standalone Demo",
}));

// Checkout Handlers (supports both /api/checkout and /api/create-payment)
var handleCheckout = async (CheckoutRequest body) =>
{
    var prodKey = body.ProductId ?? "pro";
    if (!products.TryGetValue(prodKey, out var product))
    {
        return Results.BadRequest(new { error = $"Unknown product_id '{prodKey}'" });
    }

    var provider = body.Provider ?? "paymob";
    var phone = body.Customer?.Phone?.Trim() ?? "";
    if (string.IsNullOrEmpty(phone))
    {
        return Results.BadRequest(new { error = "Customer phone is required" });
    }

    var merchantRef = !string.IsNullOrEmpty(body.MerchantReference)
        ? body.MerchantReference
        : $"dotnet_order_{Guid.NewGuid():N}"[..18];

    try
    {
        await using var client = CreateClient();
        var payment = await client.Payments.CreateAsync(new CreatePaymentParams
        {
            Provider = provider,
            AmountMinorUnits = product.AmountMinor,
            Currency = product.Currency,
            Customer = new CustomerDetails
            {
                Phone = phone,
                Email = body.Customer?.Email?.Trim(),
                FullName = body.Customer?.FullName?.Trim(),
            },
            MerchantReference = merchantRef,
            Description = $".NET SDK Demo: {product.Name}",
        }, idempotencyKey: merchantRef);

        return Results.Ok(new
        {
            payment_id = payment.PaymentId,
            paymentId = payment.PaymentId,
            provider = payment.Provider,
            status = payment.Status.ToString().ToLowerInvariant(),
            amount_minor_units = payment.AmountMinorUnits,
            amountMinorUnits = payment.AmountMinorUnits,
            currency = payment.Currency,
            merchant_reference = payment.MerchantReference,
            provider_reference = payment.ProviderReference,
            providerReference = payment.ProviderReference,
            next_action = payment.NextAction is not null ? new
            {
                type = payment.NextAction.Type,
                url = payment.NextAction.Url,
                reference = payment.NextAction.Reference,
                instructions = payment.NextAction.Instructions,
            } : null,
            nextAction = payment.NextAction is not null ? new
            {
                type = payment.NextAction.Type,
                url = payment.NextAction.Url,
                reference = payment.NextAction.Reference,
                instructions = payment.NextAction.Instructions,
            } : null,
            sdk_backend = "dotnet",
        });
    }
    catch (OpenWrapperException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message,
            code = ex.Code,
            sdk_backend = "dotnet",
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Unexpected .NET server error",
            detail: ex.Message,
            statusCode: 500);
    }
};

app.MapPost("/api/checkout", handleCheckout);
app.MapPost("/api/create-payment", handleCheckout);

// Status Poller Handlers (supports both /api/payment-status/{id} and /api/payment/{id})
var handleStatus = async (string id) =>
{
    try
    {
        await using var client = CreateClient();
        var payment = await client.Payments.GetAsync(id);
        return Results.Ok(new
        {
            payment_id = payment.PaymentId,
            paymentId = payment.PaymentId,
            status = payment.Status.ToString().ToLowerInvariant(),
            provider = payment.Provider,
            amount_minor_units = payment.AmountMinorUnits,
            amountMinorUnits = payment.AmountMinorUnits,
            currency = payment.Currency,
            provider_reference = payment.ProviderReference,
            providerReference = payment.ProviderReference,
            next_action = payment.NextAction is not null ? new
            {
                type = payment.NextAction.Type,
                url = payment.NextAction.Url,
                reference = payment.NextAction.Reference,
            } : null,
            nextAction = payment.NextAction is not null ? new
            {
                type = payment.NextAction.Type,
                url = payment.NextAction.Url,
                reference = payment.NextAction.Reference,
            } : null,
            sdk_backend = "dotnet",
        });
    }
    catch (Exception ex)
    {
        return Results.NotFound(new
        {
            error = $"Failed to resolve payment status: {ex.Message}",
            sdk_backend = "dotnet",
        });
    }
};

app.MapGet("/api/payment-status/{id}", handleStatus);
app.MapGet("/api/payment/{id}", handleStatus);

Console.WriteLine("=================================================");
Console.WriteLine(" OpenWrapper .NET 8 Standalone Checkout Demo");
Console.WriteLine(" Server running at: http://localhost:4002");
Console.WriteLine("=================================================");

app.Run();
return 0;

// Data Models
record CheckoutRequest(
    [property: JsonPropertyName("product_id")] string? ProductId,
    [property: JsonPropertyName("provider")] string? Provider,
    [property: JsonPropertyName("customer")] CustomerInput? Customer,
    [property: JsonPropertyName("merchant_reference")] string? MerchantReference
);

record CustomerInput(
    [property: JsonPropertyName("phone")] string? Phone,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("full_name")] string? FullName
);
