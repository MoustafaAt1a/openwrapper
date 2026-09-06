using OpenWrapper.Models;

namespace OpenWrapper;

public sealed class EventsClient
{
    private readonly OpenWrapperClient _client;

    internal EventsClient(OpenWrapperClient client)
    {
        _client = client;
    }

    public Task<ListEnvelope<EventRecord>> ListAsync(
        ListEventsParams? parameters = null,
        CancellationToken cancellationToken = default)
    {
        var path = "/v1/events";
        var queryParams = new List<string>();

        if (parameters?.Limit is not null)
        {
            queryParams.Add($"limit={parameters.Limit.Value}");
        }
        if (!string.IsNullOrEmpty(parameters?.StartingAfter))
        {
            queryParams.Add($"starting_after={Uri.EscapeDataString(parameters.StartingAfter)}");
        }

        if (queryParams.Count > 0)
        {
            path += "?" + string.Join("&", queryParams);
        }

        return _client.RequestAsync<ListEnvelope<EventRecord>>(
            HttpMethod.Get,
            path,
            cancellationToken: cancellationToken);
    }

    public Task<EventRecord> GetAsync(
        string eventId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(eventId))
            throw new ArgumentException("Event ID must not be empty.", nameof(eventId));

        var encoded = Uri.EscapeDataString(eventId);
        return _client.RequestAsync<EventRecord>(
            HttpMethod.Get,
            $"/v1/events/{encoded}",
            cancellationToken: cancellationToken);
    }
}
