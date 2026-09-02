using OpenWrapper.Models;
using OpenWrapper.Providers;

namespace OpenWrapper;

public sealed class PaymentsClient
{
    private readonly OpenWrapperClient _client;

    internal PaymentsClient(OpenWrapperClient client)
    {
        _client = client;
    }

    public Task<Payment> CreateAsync(
        CreatePaymentParams parameters,
        CancellationToken cancellationToken = default,
        string? idempotencyKey = null,
        ProviderCredentials? providers = null)
    {
        if (parameters.AmountMinorUnits is < 1 or > 1_000_000_000)
            throw new ArgumentOutOfRangeException(
                nameof(parameters),
                "AmountMinorUnits must be between 1 and 1000000000.");

        idempotencyKey ??= Guid.NewGuid().ToString();
        ValidateIdempotencyKey(idempotencyKey);
        var merged = MergeProviders(_client.Providers, providers);
        var headers = BuildProviderHeaders(merged);
        headers["Idempotency-Key"] = idempotencyKey;

        var body = new
        {
            provider = parameters.Provider,
            amount_minor_units = parameters.AmountMinorUnits,
            currency = parameters.Currency,
            customer = new
            {
                phone = parameters.Customer.Phone,
                email = parameters.Customer.Email,
                full_name = parameters.Customer.FullName,
            },
            merchant_reference = parameters.MerchantReference,
            description = parameters.Description,
            return_url = parameters.ReturnUrl,
            metadata = parameters.Metadata,
        };

        return _client.RequestAsync<Payment>(
            HttpMethod.Post,
            "/v1/payments",
            body,
            headers,
            cancellationToken);
    }

    public Task<Payment> GetAsync(string paymentId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(paymentId))
            throw new ArgumentException("Payment ID must not be empty.", nameof(paymentId));
        var encoded = Uri.EscapeDataString(paymentId);
        return _client.RequestAsync<Payment>(
            HttpMethod.Get,
            $"/v1/payments/{encoded}",
            cancellationToken: cancellationToken);
    }

    private static ProviderCredentials? MergeProviders(ProviderCredentials? baseProviders, ProviderCredentials? overrideProviders)
    {
        if (baseProviders is null) return overrideProviders;
        if (overrideProviders is null) return baseProviders;

        return new ProviderCredentials
        {
            Paymob = MergePaymob(baseProviders.Paymob, overrideProviders.Paymob),
            Fawry = MergeFawry(baseProviders.Fawry, overrideProviders.Fawry),
            Stripe = MergeStripe(baseProviders.Stripe, overrideProviders.Stripe),
        };
    }

    private static Dictionary<string, string> BuildProviderHeaders(ProviderCredentials? providers)
    {
        var headers = new Dictionary<string, string>();
        if (providers is null) return headers;

        if (!string.IsNullOrWhiteSpace(providers.Paymob?.SecretKey))
            headers["X-Paymob-Secret-Key"] = providers.Paymob.SecretKey;
        if (!string.IsNullOrWhiteSpace(providers.Paymob?.PublicKey))
            headers["X-Paymob-Public-Key"] = providers.Paymob.PublicKey;
        if (!string.IsNullOrWhiteSpace(providers.Paymob?.HmacSecret))
            headers["X-Paymob-Hmac-Secret"] = providers.Paymob.HmacSecret;
        if (!string.IsNullOrWhiteSpace(providers.Paymob?.IntegrationId))
            headers["X-Paymob-Integration-Id"] = providers.Paymob.IntegrationId;
        if (!string.IsNullOrWhiteSpace(providers.Paymob?.BaseUrl))
            headers["X-Paymob-Base-Url"] = providers.Paymob.BaseUrl;

        if (!string.IsNullOrWhiteSpace(providers.Fawry?.MerchantCode))
            headers["X-Fawry-Merchant-Code"] = providers.Fawry.MerchantCode;
        if (!string.IsNullOrWhiteSpace(providers.Fawry?.SecureKey))
            headers["X-Fawry-Secure-Key"] = providers.Fawry.SecureKey;
        if (!string.IsNullOrWhiteSpace(providers.Fawry?.BaseUrl))
            headers["X-Fawry-Base-Url"] = providers.Fawry.BaseUrl;

        if (!string.IsNullOrWhiteSpace(providers.Stripe?.SecretKey))
            headers["X-Stripe-Secret-Key"] = providers.Stripe.SecretKey;

        return headers;
    }

    private static PaymobCredentials? MergePaymob(PaymobCredentials? defaults, PaymobCredentials? overrides)
    {
        if (defaults is null) return overrides;
        if (overrides is null) return defaults;
        return new PaymobCredentials
        {
            SecretKey = overrides.SecretKey ?? defaults.SecretKey,
            PublicKey = overrides.PublicKey ?? defaults.PublicKey,
            HmacSecret = overrides.HmacSecret ?? defaults.HmacSecret,
            IntegrationId = overrides.IntegrationId ?? defaults.IntegrationId,
            BaseUrl = overrides.BaseUrl ?? defaults.BaseUrl,
        };
    }

    private static FawryCredentials? MergeFawry(FawryCredentials? defaults, FawryCredentials? overrides)
    {
        if (defaults is null) return overrides;
        if (overrides is null) return defaults;
        return new FawryCredentials
        {
            MerchantCode = overrides.MerchantCode ?? defaults.MerchantCode,
            SecureKey = overrides.SecureKey ?? defaults.SecureKey,
            BaseUrl = overrides.BaseUrl ?? defaults.BaseUrl,
        };
    }

    private static StripeCredentials? MergeStripe(StripeCredentials? defaults, StripeCredentials? overrides)
    {
        if (defaults is null) return overrides;
        if (overrides is null) return defaults;
        return new StripeCredentials
        {
            SecretKey = overrides.SecretKey ?? defaults.SecretKey,
        };
    }

    private static void ValidateIdempotencyKey(string value)
    {
        if (value.Length is < 1 or > 200 || value.Any(c => c < '!' || c > '~' || c == '"'))
        {
            throw new ArgumentException(
                "Idempotency key must be 1-200 printable ASCII characters without quotes or whitespace.",
                nameof(value));
        }
    }
}
