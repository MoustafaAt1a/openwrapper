namespace OpenWrapper.Models;

public sealed class CreateWebhookEndpointParams
{
    public required string Url { get; init; }
    public List<string>? Events { get; init; }
}

public sealed class WebhookEndpointRecord
{
    public required string Id { get; init; }
    public string? UserId { get; init; }
    public required string Url { get; init; }
    public string? Secret { get; init; }
    public required List<string> Events { get; init; }
    public required bool IsActive { get; init; }
    public required long CreatedAt { get; init; }
}
