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
        idempotencyKey ??= Guid.NewGuid().ToString();
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
            Paymob = overrideProviders.Paymob ?? baseProviders.Paymob,
            Fawry = overrideProviders.Fawry ?? baseProviders.Fawry,
            Stripe = overrideProviders.Stripe ?? baseProviders.Stripe,
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
}
