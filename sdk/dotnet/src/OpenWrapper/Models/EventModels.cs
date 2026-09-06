using System.Text.Json;

namespace OpenWrapper.Models;

public sealed class ListEventsParams
{
    public int? Limit { get; init; }
    public string? StartingAfter { get; init; }
}

public sealed class EventRecord
{
    public required string Id { get; init; }
    public string? UserId { get; init; }
    public required string EventType { get; init; }
    public required string ResourceId { get; init; }
    public JsonElement Payload { get; init; }
    public required long CreatedAt { get; init; }
}
