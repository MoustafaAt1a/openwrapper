namespace OpenWrapper.Exceptions;

public sealed class ErrorBody
{
    public ErrorDetail Error { get; init; } = new();
}

public sealed class ErrorDetail
{
    public string Code { get; init; } = "";
    public string Message { get; init; } = "";
}

public abstract class OpenWrapperException : Exception
{
    public abstract string Code { get; }
    public int HttpStatus { get; }

    protected OpenWrapperException(string message, int httpStatus) : base(message)
    {
        HttpStatus = httpStatus;
    }
}

public sealed class ValidationException : OpenWrapperException
{
    public override string Code => "validation_error";
    public ValidationException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class AuthenticationException : OpenWrapperException
{
    public override string Code => "authentication_error";
    public AuthenticationException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class AuthorizationException : OpenWrapperException
{
    public override string Code => "authorization_error";
    public AuthorizationException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class ConfigurationException : OpenWrapperException
{
    public override string Code => "configuration_error";
    public ConfigurationException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class NetworkException : OpenWrapperException
{
    public override string Code => "network_error";
    public NetworkException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class TimeoutException : OpenWrapperException
{
    public override string Code => "timeout";
    public TimeoutException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class ProviderException : OpenWrapperException
{
    public override string Code => "provider_error";
    public ProviderException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class RateLimitException : OpenWrapperException
{
    public override string Code => "rate_limit";
    public RateLimitException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class UnsupportedCapabilityException : OpenWrapperException
{
    public override string Code => "unsupported_capability";
    public UnsupportedCapabilityException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class SecurityException : OpenWrapperException
{
    public override string Code => "security_error";
    public SecurityException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class InternalException : OpenWrapperException
{
    public override string Code => "internal_error";
    public InternalException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class UnknownOutcomeException : OpenWrapperException
{
    public override string Code => "unknown_outcome";
    public UnknownOutcomeException(string message, int httpStatus) : base(message, httpStatus) { }
}

public sealed class GatewayUnreachableException : Exception
{
    public string Code => "gateway_unreachable";
    public GatewayUnreachableException(string message) : base(message) { }
}

public static class ExceptionFactory
{
    private static readonly Dictionary<string, Func<string, int, OpenWrapperException>> Map = new()
    {
        ["validation_error"] = (m, s) => new ValidationException(m, s),
        ["authentication_error"] = (m, s) => new AuthenticationException(m, s),
        ["authorization_error"] = (m, s) => new AuthorizationException(m, s),
        ["configuration_error"] = (m, s) => new ConfigurationException(m, s),
        ["network_error"] = (m, s) => new NetworkException(m, s),
        ["timeout"] = (m, s) => new TimeoutException(m, s),
        ["provider_error"] = (m, s) => new ProviderException(m, s),
        ["rate_limit"] = (m, s) => new RateLimitException(m, s),
        ["unsupported_capability"] = (m, s) => new UnsupportedCapabilityException(m, s),
        ["security_error"] = (m, s) => new SecurityException(m, s),
        ["internal_error"] = (m, s) => new InternalException(m, s),
        ["unknown_outcome"] = (m, s) => new UnknownOutcomeException(m, s),
    };

    public static OpenWrapperException FromBody(ErrorBody body, int httpStatus)
    {
        if (Map.TryGetValue(body.Error.Code, out var factory))
        {
            return factory(body.Error.Message, httpStatus);
        }

        return new InternalException(body.Error.Message, httpStatus);
    }
}
