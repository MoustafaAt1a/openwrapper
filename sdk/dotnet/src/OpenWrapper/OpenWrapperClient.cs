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
    private readonly string _baseUrl;

    public OpenWrapperClient(OpenWrapperClientOptions options, HttpClient? httpClient = null)
    {
        ArgumentNullException.ThrowIfNull(options);
        _baseUrl = NormalizeBaseUrl(options.BaseUrl);
        if (options.MaxRetries < 0)
            throw new ArgumentOutOfRangeException(nameof(options.MaxRetries), "MaxRetries must not be negative.");
        if (options.RetryDelayMs < 0)
            throw new ArgumentOutOfRangeException(nameof(options.RetryDelayMs), "RetryDelayMs must not be negative.");
        if (options.Timeout <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(options.Timeout), "Timeout must be positive.");

        _options = options;
        _ownsHttpClient = httpClient is null;
        _httpClient = httpClient ?? new HttpClient();
        if (_ownsHttpClient)
        {
            _httpClient.Timeout = System.Threading.Timeout.InfiniteTimeSpan;
        }
        Payments = new PaymentsClient(this);
    }

    public PaymentsClient Payments { get; }

    internal string BaseUrl => _baseUrl;
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
            cancellationToken.ThrowIfCancellationRequested();
            attempt++;
            using var request = new HttpRequestMessage(method, UrlFor(path));

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
            using var attemptCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            attemptCancellation.CancelAfter(_options.Timeout);
            try
            {
                response = await HttpClient.SendAsync(request, attemptCancellation.Token);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (OperationCanceledException ex)
            {
                if (attempt >= maxAttempts)
                {
                    throw new GatewayTimeoutException(
                        $"OpenWrapper gateway request timed out after {_options.Timeout.TotalMilliseconds:0}ms: {ex.Message}");
                }

                await DelayBeforeRetryAsync(attempt, cancellationToken);
                continue;
            }
            catch (HttpRequestException ex)
            {
                if (attempt >= maxAttempts)
                {
                    throw new GatewayUnreachableException(
                        $"Failed to reach OpenWrapper gateway at {UrlFor(path)} after {attempt} attempt(s): {ex.Message}");
                }

                await DelayBeforeRetryAsync(attempt, cancellationToken);
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

    private static string NormalizeBaseUrl(string raw)
    {
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || !string.IsNullOrEmpty(uri.UserInfo))
        {
            throw new ArgumentException(
                "BaseUrl must be an absolute HTTP(S) URL without embedded credentials.",
                nameof(OpenWrapperClientOptions.BaseUrl));
        }
        if (!string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new ArgumentException(
                "BaseUrl must not contain a query string or fragment.",
                nameof(OpenWrapperClientOptions.BaseUrl));
        }
        return raw.TrimEnd('/');
    }

    private string UrlFor(string path)
    {
        if (BaseUrl.EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            && path.StartsWith("/v1/", StringComparison.Ordinal))
        {
            return BaseUrl + path[3..];
        }
        return BaseUrl + path;
    }

    private async Task DelayBeforeRetryAsync(int attempt, CancellationToken cancellationToken)
    {
        var multiplier = Math.Pow(2, attempt - 1);
        var delayMs = (int)Math.Min(int.MaxValue, RetryDelayMs * multiplier);
        if (delayMs > 0)
        {
            await Task.Delay(delayMs, cancellationToken);
        }
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
