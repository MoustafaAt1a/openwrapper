using OpenWrapper.Models;

namespace OpenWrapper;

public sealed class WebhookEndpointsClient
{
    private readonly OpenWrapperClient _client;

    internal WebhookEndpointsClient(OpenWrapperClient client)
    {
        _client = client;
    }

    public Task<WebhookEndpointRecord> CreateAsync(
        CreateWebhookEndpointParams parameters,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(parameters);
        if (string.IsNullOrWhiteSpace(parameters.Url))
            throw new ArgumentException("Webhook URL must not be empty.", nameof(parameters));

        var body = new
        {
            url = parameters.Url,
            events = parameters.Events,
        };

        return _client.RequestAsync<WebhookEndpointRecord>(
            HttpMethod.Post,
            "/v1/webhook_endpoints",
            body,
            cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<WebhookEndpointRecord>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        var envelope = await _client.RequestAsync<ListEnvelope<WebhookEndpointRecord>>(
            HttpMethod.Get,
            "/v1/webhook_endpoints",
            cancellationToken: cancellationToken);

        return envelope.Data;
    }

    public Task DeleteAsync(
        string endpointId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(endpointId))
            throw new ArgumentException("Endpoint ID must not be empty.", nameof(endpointId));

        var encoded = Uri.EscapeDataString(endpointId);
        return _client.RequestAsync<object>(
            HttpMethod.Delete,
            $"/v1/webhook_endpoints/{encoded}",
            cancellationToken: cancellationToken);
    }
}
