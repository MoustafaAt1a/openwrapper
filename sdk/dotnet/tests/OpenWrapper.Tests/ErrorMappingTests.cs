using OpenWrapper.Exceptions;

namespace OpenWrapper.Tests;

public class ErrorMappingTests
{
  [Theory]
  [InlineData("validation_error", typeof(ValidationException))]
  [InlineData("authentication_error", typeof(AuthenticationException))]
  [InlineData("authorization_error", typeof(AuthorizationException))]
  [InlineData("configuration_error", typeof(ConfigurationException))]
  [InlineData("network_error", typeof(NetworkException))]
  [InlineData("timeout", typeof(OpenWrapper.Exceptions.TimeoutException))]
  [InlineData("provider_error", typeof(ProviderException))]
  [InlineData("rate_limit", typeof(RateLimitException))]
  [InlineData("unsupported_capability", typeof(UnsupportedCapabilityException))]
  [InlineData("security_error", typeof(SecurityException))]
  [InlineData("internal_error", typeof(InternalException))]
  [InlineData("unknown_outcome", typeof(UnknownOutcomeException))]
  public void FromBody_MapsKnownCodes(string code, Type expectedType)
  {
    var ex = ExceptionFactory.FromBody(
      new ErrorBody { Error = new ErrorDetail { Code = code, Message = "test message" } },
      400);

    Assert.IsType(expectedType, ex);
    Assert.Equal("test message", ex.Message);
    Assert.Equal(400, ex.HttpStatus);
    Assert.Equal(code, ex.Code);
  }

  [Theory]
  [InlineData("invalid_request", typeof(ValidationException), "validation_error")]
  [InlineData("idempotency_conflict", typeof(ValidationException), "validation_error")]
  [InlineData("missing_provider_credentials", typeof(ValidationException), "validation_error")]
  [InlineData("not_found", typeof(ValidationException), "validation_error")]
  [InlineData("unauthorized", typeof(AuthorizationException), "authorization_error")]
  [InlineData("timeout_error", typeof(OpenWrapper.Exceptions.TimeoutException), "timeout")]
  [InlineData("rate_limit_error", typeof(RateLimitException), "rate_limit")]
  public void FromBody_MapsProxyAliases(string code, Type expectedType, string canonicalCode)
  {
    var ex = ExceptionFactory.FromBody(
      new ErrorBody { Error = new ErrorDetail { Code = code, Message = "test message" } },
      422);

    Assert.IsType(expectedType, ex);
    Assert.Equal(canonicalCode, ex.Code);
  }

  [Fact]
  public void FromBody_UnknownCodeFallsBackToInternal()
  {
    var ex = ExceptionFactory.FromBody(
      new ErrorBody { Error = new ErrorDetail { Code = "not_a_real_code", Message = "oops" } },
      500);

    Assert.IsType<InternalException>(ex);
    Assert.Equal("internal_error", ex.Code);
  }
}
