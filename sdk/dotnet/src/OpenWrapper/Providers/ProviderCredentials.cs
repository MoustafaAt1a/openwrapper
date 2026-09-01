namespace OpenWrapper.Providers;

public sealed class PaymobCredentials
{
    public string? SecretKey { get; init; }
    public string? PublicKey { get; init; }
    public string? HmacSecret { get; init; }
    public string? IntegrationId { get; init; }
}

public sealed class FawryCredentials
{
    public string? MerchantCode { get; init; }
    public string? SecureKey { get; init; }
    public string? BaseUrl { get; init; }
}

public sealed class StripeCredentials
{
    public string? SecretKey { get; init; }
}

public sealed class ProviderCredentials
{
    public PaymobCredentials? Paymob { get; init; }
    public FawryCredentials? Fawry { get; init; }
    public StripeCredentials? Stripe { get; init; }
}
