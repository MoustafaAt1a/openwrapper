namespace OpenWrapper.Models;

public sealed class CreateRefundParams
{
    public required long AmountMinorUnits { get; init; }
    public string? Reason { get; init; }
}

public sealed class RefundRecord
{
    public required string Id { get; init; }
    public required string PaymentId { get; init; }
    public required long AmountMinorUnits { get; init; }
    public required string Currency { get; init; }
    public required string Status { get; init; }
    public string? Reason { get; init; }
    public string? ProviderRefundRef { get; init; }
    public required long CreatedAt { get; init; }
}
