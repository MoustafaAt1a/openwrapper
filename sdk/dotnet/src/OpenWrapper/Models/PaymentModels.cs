namespace OpenWrapper.Models;

public enum PaymentStatus
{
    Pending,
    Succeeded,
    Failed,
    Unknown,
}

public enum PaymentProvider
{
    Paymob,
    Fawry,
    Stripe,
}

public enum PaymentCurrency
{
    EGP,
    USD,
}

public sealed class CustomerDetails
{
    public required string Phone { get; init; }
    public string? Email { get; init; }
    public string? FullName { get; init; }
}

public sealed class CreatePaymentParams
{
    public required string Provider { get; init; }
    public required int AmountMinorUnits { get; init; }
    public required string Currency { get; init; }
    public required CustomerDetails Customer { get; init; }
    public string? MerchantReference { get; init; }
    public string? Description { get; init; }
    public string? ReturnUrl { get; init; }
    public Dictionary<string, string>? Metadata { get; init; }
}

public sealed class PaymentNextAction
{
    public string Type { get; init; } = "";
    public string? Url { get; init; }
    public string? Reference { get; init; }
    public string? Instructions { get; init; }
}

public sealed class Payment
{
    public required string PaymentId { get; init; }
    public required string Provider { get; init; }
    public string? ProviderReference { get; init; }
    public required string Status { get; init; }
    public required int AmountMinorUnits { get; init; }
    public required string Currency { get; init; }
    public string? MerchantReference { get; init; }
    public PaymentNextAction? NextAction { get; init; }
}
