using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using OpenWrapper.Exceptions;
using OpenWrapper.Http;
using OpenWrapper.Models;
using OpenWrapper.Providers;

namespace OpenWrapper;

public sealed class OpenWrapperClientOptions
{
    public required string BaseUrl { get; init; }
    public string? ApiKey { get; init; }
    public ProviderCredentials? Providers { get; init; }
    public int MaxRetries { get; init; } = 0;
    public int RetryDelayMs { get; init; } = 200;
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(30);
}

public sealed class OpenWrapperClient : IAsyncDisposable, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly OpenWrapperClientOptions _options;

    public OpenWrapperClient(OpenWrapperClientOptions options, HttpClient? httpClient = null)
    {
        _options = options;
        _ownsHttpClient = httpClient is null;
        _httpClient = httpClient ?? new HttpClient();
        _httpClient.Timeout = options.Timeout;
        Payments = new PaymentsClient(this);
    }

    public PaymentsClient Payments { get; }

    internal string BaseUrl => _options.BaseUrl.TrimEnd('/');
    internal string? ApiKey => _options.ApiKey;
    internal ProviderCredentials? Providers => _options.Providers;
    internal int MaxRetries => _options.MaxRetries;
    internal int RetryDelayMs => _options.RetryDelayMs;
    internal HttpClient HttpClient => _httpClient;

    internal async Task<T> RequestAsync<T>(
        HttpMethod method,
        string path,
        object? body = null,
        IReadOnlyDictionary<string, string>? extraHeaders = null,
        CancellationToken cancellationToken = default)
    {
        var attempt = 0;
        var maxAttempts = Math.Max(1, MaxRetries + 1);

        while (attempt < maxAttempts)
        {
            attempt++;
            using var request = new HttpRequestMessage(method, $"{BaseUrl}{path}");

            if (ApiKey is not null)
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
                request.Headers.TryAddWithoutValidation("X-API-Key", ApiKey);
            }

            if (extraHeaders is not null)
            {
                foreach (var (key, value) in extraHeaders)
                {
                    request.Headers.TryAddWithoutValidation(key, value);
                }
            }

            if (body is not null)
            {
                var json = JsonSerializer.Serialize(body, OpenWrapperJson.Options);
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            }

            HttpResponseMessage response;
            try
            {
                response = await HttpClient.SendAsync(request, cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                if (attempt >= maxAttempts)
                {
                    throw new GatewayUnreachableException(
                        $"Failed to reach OpenWrapper gateway at {BaseUrl}{path} after {attempt} attempt(s): {ex.Message}");
                }

                await Task.Delay(RetryDelayMs * (int)Math.Pow(2, attempt - 1), cancellationToken);
                continue;
            }

            using (response)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    return JsonSerializer.Deserialize<T>(content, OpenWrapperJson.Options)
                        ?? throw new GatewayUnreachableException("Empty response from gateway");
                }

                ErrorBody? errorBody = null;
                try
                {
                    errorBody = JsonSerializer.Deserialize<ErrorBody>(content, OpenWrapperJson.Options);
                }
                catch (JsonException)
                {
                    // ignored
                }

                if (errorBody?.Error?.Code is not null)
                {
                    throw ExceptionFactory.FromBody(errorBody, (int)response.StatusCode);
                }

                throw new GatewayUnreachableException(
                    $"HTTP {(int)response.StatusCode} from gateway: {response.ReasonPhrase}");
            }
        }

        throw new GatewayUnreachableException("Request loop exited unexpectedly");
    }

    public void Dispose()
    {
        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }
    }

    public ValueTask DisposeAsync()
    {
        Dispose();
        return ValueTask.CompletedTask;
    }
}
