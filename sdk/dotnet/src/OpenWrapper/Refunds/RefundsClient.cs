using OpenWrapper.Models;

namespace OpenWrapper;

public sealed class RefundsClient
{
    private readonly OpenWrapperClient _client;

    internal RefundsClient(OpenWrapperClient client)
    {
        _client = client;
    }

    public Task<RefundRecord> CreateAsync(
        string paymentId,
        long amountMinorUnits,
        string? reason = null,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default) =>
        CreateAsync(paymentId, new CreateRefundParams { AmountMinorUnits = amountMinorUnits, Reason = reason }, idempotencyKey, cancellationToken);

    public Task<RefundRecord> CreateAsync(
        string paymentId,
        CreateRefundParams parameters,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(paymentId))
            throw new ArgumentException("Payment ID must not be empty.", nameof(paymentId));
        if (parameters.AmountMinorUnits is < 1 or > 1_000_000_000)
            throw new ArgumentOutOfRangeException(
                nameof(parameters),
                "AmountMinorUnits must be between 1 and 1000000000.");

        Dictionary<string, string>? headers = null;
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            headers = new Dictionary<string, string>
            {
                ["Idempotency-Key"] = idempotencyKey,
            };
        }

        var body = new
        {
            amount_minor_units = parameters.AmountMinorUnits,
            reason = parameters.Reason,
        };

        var encoded = Uri.EscapeDataString(paymentId);
        return _client.RequestAsync<RefundRecord>(
            HttpMethod.Post,
            $"/v1/payments/{encoded}/refunds",
            body,
            headers,
            cancellationToken);
    }

    public async Task<IReadOnlyList<RefundRecord>> ListAsync(
        string paymentId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(paymentId))
            throw new ArgumentException("Payment ID must not be empty.", nameof(paymentId));

        var encoded = Uri.EscapeDataString(paymentId);
        var envelope = await _client.RequestAsync<ListEnvelope<RefundRecord>>(
            HttpMethod.Get,
            $"/v1/payments/{encoded}/refunds",
            cancellationToken: cancellationToken);

        return envelope.Data;
    }
}
