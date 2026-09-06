using System.Net;
using System.Text;
using OpenWrapper;
using OpenWrapper.Exceptions;
using OpenWrapper.Models;
using OpenWrapper.Providers;

namespace OpenWrapper.Tests;

public sealed class MockHttpMessageHandler : HttpMessageHandler
{
  private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

  public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
  {
    _handler = handler;
  }

  protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
  {
    return Task.FromResult(_handler(request));
  }
}

public class ClientTests
{
  private static OpenWrapperClient CreateClient(Func<HttpRequestMessage, HttpResponseMessage> handler)
  {
    var httpClient = new HttpClient(new MockHttpMessageHandler(handler));
    return new OpenWrapperClient(new OpenWrapperClientOptions { BaseUrl = "https://gateway.test" }, httpClient);
  }

  [Fact]
  public async Task CreateAsync_SendsIdempotencyKeyHeader()
  {
    string? capturedKey = null;
    await using var client = CreateClient(request =>
    {
      capturedKey = request.Headers.GetValues("Idempotency-Key").FirstOrDefault();
      return JsonResponse(
        """
        {
          "payment_id": "01ABC",
          "provider": "paymob",
          "provider_reference": "txn-1",
          "status": "pending",
          "amount_minor_units": 1000,
          "currency": "EGP",
          "merchant_reference": null,
          "next_action": { "type": "redirect_to_url", "url": "https://accept.paymob.com/..." }
        }
        """,
        HttpStatusCode.Created);
    });

    var payment = await client.Payments.CreateAsync(new CreatePaymentParams
    {
      Provider = "paymob",
      AmountMinorUnits = 1000,
      Currency = "EGP",
      Customer = new CustomerDetails { Phone = "+201234567890" },
    });

    Assert.False(string.IsNullOrWhiteSpace(capturedKey));
    Assert.Equal("01ABC", payment.PaymentId);
    Assert.Equal("pending", payment.Status);
    Assert.Equal("https://accept.paymob.com/...", payment.NextAction?.Url);
  }

  [Fact]
  public async Task CreateAsync_UsesCallerSuppliedIdempotencyKey()
  {
    string? capturedKey = null;
    await using var client = CreateClient(request =>
    {
      capturedKey = request.Headers.GetValues("Idempotency-Key").FirstOrDefault();
      return JsonResponse(
        """
        {
          "payment_id": "01ABC",
          "provider": "fawry",
          "provider_reference": "MR-1",
          "status": "pending",
          "amount_minor_units": 500,
          "currency": "EGP",
          "merchant_reference": "order-7"
        }
        """,
        HttpStatusCode.Created);
    });

    await client.Payments.CreateAsync(
      new CreatePaymentParams
      {
        Provider = "fawry",
        AmountMinorUnits = 500,
        Currency = "EGP",
        Customer = new CustomerDetails { Phone = "+2010" },
      },
      idempotencyKey: "order-7");

    Assert.Equal("order-7", capturedKey);
  }

  [Fact]
  public async Task CreateAsync_ThrowsValidationExceptionOn400()
  {
    await using var client = CreateClient(_ =>
      JsonResponse(
        """{"error":{"code":"validation_error","message":"invalid amount"}}""",
        HttpStatusCode.BadRequest));

    var ex = await Assert.ThrowsAsync<ValidationException>(() =>
      client.Payments.CreateAsync(new CreatePaymentParams
      {
        Provider = "paymob",
        AmountMinorUnits = 1,
        Currency = "EGP",
        Customer = new CustomerDetails { Phone = "1" },
      }));

    Assert.Equal("invalid amount", ex.Message);
    Assert.Equal(400, ex.HttpStatus);
  }

  [Fact]
  public async Task GetAsync_ThrowsRateLimitExceptionOn429()
  {
    await using var client = CreateClient(_ =>
      JsonResponse(
        """{"error":{"code":"rate_limit","message":"slow down"}}""",
        (HttpStatusCode)429));

    await Assert.ThrowsAsync<RateLimitException>(() => client.Payments.GetAsync("01ABC"));
  }

  [Fact]
  public async Task GetAsync_ThrowsGatewayUnreachableOnNetworkFailure()
  {
    var httpClient = new HttpClient(new ThrowingHandler());
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions { BaseUrl = "https://gateway.test", MaxRetries = 0 },
      httpClient);

    await Assert.ThrowsAsync<GatewayUnreachableException>(() => client.Payments.GetAsync("01ABC"));
  }

  [Fact]
  public async Task GetAsync_ReturnsUnknownStatusAsNormalValue()
  {
    await using var client = CreateClient(_ =>
      JsonResponse(
        """
        {
          "payment_id": "01ABC",
          "provider": "paymob",
          "provider_reference": null,
          "status": "unknown",
          "amount_minor_units": 1000,
          "currency": "EGP",
          "merchant_reference": null
        }
        """,
        HttpStatusCode.OK));

    var payment = await client.Payments.GetAsync("01ABC");
    Assert.Equal("unknown", payment.Status);
  }

  [Fact]
  public async Task GetAsync_SendsApiKeyHeader()
  {
    string? capturedApiKey = null;
    var httpClient = new HttpClient(new MockHttpMessageHandler(request =>
    {
      capturedApiKey = request.Headers.GetValues("X-API-Key").FirstOrDefault();
      return JsonResponse(
        """
        {
          "payment_id": "01ABC",
          "provider": "paymob",
          "provider_reference": null,
          "status": "pending",
          "amount_minor_units": 1000,
          "currency": "EGP",
          "merchant_reference": null
        }
        """,
        HttpStatusCode.OK);
    }));

    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions { BaseUrl = "https://gateway.test", ApiKey = "test-secret-key-123" },
      httpClient);

    await client.Payments.GetAsync("01ABC");
    Assert.Equal("test-secret-key-123", capturedApiKey);
  }

  [Fact]
  public async Task CreateAsync_SendsProviderCredentialHeaders()
  {
    var captured = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions
      {
        BaseUrl = "https://gateway.test",
        Providers = new ProviderCredentials
        {
          Paymob = new PaymobCredentials
          {
            SecretKey = "pm-secret",
            PublicKey = "pm-pub",
            HmacSecret = "pm-hmac",
            IntegrationId = "99",
            BaseUrl = "https://paymob.test",
          },
          Fawry = new FawryCredentials
          {
            MerchantCode = "MC",
            SecureKey = "fw-key",
            BaseUrl = "https://fawry.test",
          },
          Stripe = new StripeCredentials { SecretKey = "sk_test_123" },
        },
      },
      new HttpClient(new MockHttpMessageHandler(request =>
      {
        foreach (var header in request.Headers)
        {
          captured[header.Key] = string.Join(",", header.Value);
        }

        return JsonResponse(
          """
          {
            "payment_id": "01ABC",
            "provider": "paymob",
            "provider_reference": "ref",
            "status": "pending",
            "amount_minor_units": 1000,
            "currency": "EGP",
            "merchant_reference": null
          }
          """,
          HttpStatusCode.OK);
      })));

    await client.Payments.CreateAsync(
      new CreatePaymentParams
      {
        Provider = "paymob",
        AmountMinorUnits = 1000,
        Currency = "EGP",
        Customer = new CustomerDetails { Phone = "+2010" },
      },
      idempotencyKey: "k1");

    Assert.Equal("pm-secret", captured["X-Paymob-Secret-Key"]);
    Assert.Equal("https://paymob.test", captured["X-Paymob-Base-Url"]);
    Assert.Equal("MC", captured["X-Fawry-Merchant-Code"]);
    Assert.Equal("sk_test_123", captured["X-Stripe-Secret-Key"]);
  }

  [Fact]
  public async Task GetAsync_DoesNotDuplicateVersionedBaseUrlAndEncodesId()
  {
    string? capturedUrl = null;
    var httpClient = new HttpClient(new MockHttpMessageHandler(request =>
    {
      capturedUrl = request.RequestUri?.ToString();
      return JsonResponse(
        """{"payment_id":"01ABC","provider":"paymob","provider_reference":null,"status":"pending","amount_minor_units":1000,"currency":"EGP","merchant_reference":null}""",
        HttpStatusCode.OK);
    }));
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions { BaseUrl = "https://gateway.test/api/v1/" },
      httpClient);

    await client.Payments.GetAsync("part/other");

    Assert.Equal("https://gateway.test/api/v1/payments/part%2Fother", capturedUrl);
  }

  [Fact]
  public async Task CreateAsync_MergesProviderOverridesFieldByField()
  {
    var captured = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var httpClient = new HttpClient(new MockHttpMessageHandler(request =>
    {
      foreach (var header in request.Headers)
        captured[header.Key] = string.Join(",", header.Value);
      return JsonResponse(
        """{"payment_id":"01ABC","provider":"paymob","provider_reference":null,"status":"pending","amount_minor_units":1000,"currency":"EGP","merchant_reference":null}""",
        HttpStatusCode.OK);
    }));
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions
      {
        BaseUrl = "https://gateway.test",
        Providers = new ProviderCredentials
        {
          Paymob = new PaymobCredentials { SecretKey = "default-secret", PublicKey = "default-public" },
        },
      },
      httpClient);

    await client.Payments.CreateAsync(
      new CreatePaymentParams
      {
        Provider = "paymob",
        AmountMinorUnits = 1000,
        Currency = "EGP",
        Customer = new CustomerDetails { Phone = "+2010" },
      },
      providers: new ProviderCredentials
      {
        Paymob = new PaymobCredentials { PublicKey = "override-public" },
      });

    Assert.Equal("default-secret", captured["X-Paymob-Secret-Key"]);
    Assert.Equal("override-public", captured["X-Paymob-Public-Key"]);
  }

  [Fact]
  public async Task CreateAsync_RejectsInvalidAmountAndIdempotencyKeyBeforeSending()
  {
    var calls = 0;
    await using var client = CreateClient(_ =>
    {
      calls++;
      return JsonResponse("{}", HttpStatusCode.OK);
    });
    var parameters = new CreatePaymentParams
    {
      Provider = "paymob",
      AmountMinorUnits = 0,
      Currency = "EGP",
      Customer = new CustomerDetails { Phone = "+2010" },
    };

    await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => client.Payments.CreateAsync(parameters));
    parameters = new CreatePaymentParams
    {
      Provider = "paymob",
      AmountMinorUnits = 1,
      Currency = "EGP",
      Customer = new CustomerDetails { Phone = "+2010" },
    };
    await Assert.ThrowsAsync<ArgumentException>(() =>
      client.Payments.CreateAsync(parameters, idempotencyKey: "has space"));
    Assert.Equal(0, calls);
  }

  [Fact]
  public async Task GetAsync_ClientDeadlineThrowsGatewayTimeout()
  {
    var httpClient = new HttpClient(new DelayedHandler());
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions { BaseUrl = "https://gateway.test", Timeout = TimeSpan.FromMilliseconds(10) },
      httpClient);

    await Assert.ThrowsAsync<GatewayTimeoutException>(() => client.Payments.GetAsync("01ABC"));
  }

  [Fact]
  public async Task GetAsync_CallerCancellationIsNotWrappedOrRetried()
  {
    using var cancellation = new CancellationTokenSource();
    cancellation.Cancel();
    var handler = new DelayedHandler();
    var httpClient = new HttpClient(handler);
    await using var client = new OpenWrapperClient(
      new OpenWrapperClientOptions { BaseUrl = "https://gateway.test", MaxRetries = 2 },
      httpClient);

    await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
      client.Payments.GetAsync("01ABC", cancellation.Token));
    Assert.Equal(0, handler.Calls);
  }

  [Fact]
  public async Task Refunds_CreateAndList_CallCorrectEndpoints()
  {
    string? capturedPath = null;
    string? capturedMethod = null;
    string? capturedIdempotency = null;

    await using var client = CreateClient(req =>
    {
      capturedPath = req.RequestUri?.PathAndQuery;
      capturedMethod = req.Method.Method;
      if (req.Headers.TryGetValues("Idempotency-Key", out var vals))
      {
        capturedIdempotency = vals.FirstOrDefault();
      }

      if (capturedMethod == "POST")
      {
        return JsonResponse(
          """
          {
            "id": "ref_1",
            "payment_id": "pay_1",
            "amount_minor_units": 500,
            "currency": "EGP",
            "status": "succeeded",
            "reason": "customer_request",
            "created_at": 1725616800
          }
          """,
          HttpStatusCode.Created);
      }
      return JsonResponse(
        """
        {
          "data": [
            {
              "id": "ref_1",
              "payment_id": "pay_1",
              "amount_minor_units": 500,
              "currency": "EGP",
              "status": "succeeded",
              "created_at": 1725616800
            }
          ]
        }
        """,
        HttpStatusCode.OK);
    });

    var refund = await client.Refunds.CreateAsync(
      "pay_1",
      new CreateRefundParams { AmountMinorUnits = 500, Reason = "customer_request" },
      idempotencyKey: "ref-idemp-1");

    Assert.Equal("/v1/payments/pay_1/refunds", capturedPath);
    Assert.Equal("POST", capturedMethod);
    Assert.Equal("ref-idemp-1", capturedIdempotency);
    Assert.Equal("ref_1", refund.Id);
    Assert.Equal(500, refund.AmountMinorUnits);
    Assert.Equal("succeeded", refund.Status);

    var list = await client.Refunds.ListAsync("pay_1");
    Assert.Equal("/v1/payments/pay_1/refunds", capturedPath);
    Assert.Equal("GET", capturedMethod);
    Assert.Single(list);
    Assert.Equal("ref_1", list[0].Id);
  }

  [Fact]
  public async Task Events_ListAndGet_CallCorrectEndpoints()
  {
    string? capturedPath = null;

    await using var client = CreateClient(req =>
    {
      capturedPath = req.RequestUri?.PathAndQuery;
      if (req.RequestUri?.AbsolutePath == "/v1/events")
      {
        return JsonResponse(
          """
          {
            "data": [
              {
                "id": "evt_1",
                "event_type": "payment.created",
                "resource_id": "pay_1",
                "created_at": 1725616800
              }
            ],
            "has_more": false
          }
          """,
          HttpStatusCode.OK);
      }
      return JsonResponse(
        """
        {
          "id": "evt_1",
          "event_type": "payment.created",
          "resource_id": "pay_1",
          "created_at": 1725616800
        }
        """,
        HttpStatusCode.OK);
    });

    var env = await client.Events.ListAsync(new ListEventsParams { Limit = 10, StartingAfter = "evt_0" });
    Assert.Equal("/v1/events?limit=10&starting_after=evt_0", capturedPath);
    Assert.Single(env.Data);
    Assert.Equal("evt_1", env.Data[0].Id);
    Assert.False(env.HasMore);

    var evt = await client.Events.GetAsync("evt_1");
    Assert.Equal("/v1/events/evt_1", capturedPath);
    Assert.Equal("evt_1", evt.Id);
  }

  [Fact]
  public async Task WebhookEndpoints_Crud_AndWebhooksVerification()
  {
    string? capturedMethod = null;
    string? capturedPath = null;

    await using var client = CreateClient(req =>
    {
      capturedMethod = req.Method.Method;
      capturedPath = req.RequestUri?.PathAndQuery;

      if (capturedMethod == "POST")
      {
        return JsonResponse(
          """
          {
            "id": "we_1",
            "url": "https://example.com/webhook",
            "secret": "whsec_test",
            "events": ["payment.created"],
            "is_active": true,
            "created_at": 1725616800
          }
          """,
          HttpStatusCode.Created);
      }
      if (capturedMethod == "GET")
      {
        return JsonResponse(
          """
          {
            "data": [
              {
                "id": "we_1",
                "url": "https://example.com/webhook",
                "events": ["payment.created"],
                "is_active": true,
                "created_at": 1725616800
              }
            ]
          }
          """,
          HttpStatusCode.OK);
      }
      return new HttpResponseMessage(HttpStatusCode.NoContent);
    });

    var ep = await client.WebhookEndpoints.CreateAsync(new CreateWebhookEndpointParams
    {
      Url = "https://example.com/webhook",
      Events = new List<string> { "payment.created" },
    });
    Assert.Equal("we_1", ep.Id);
    Assert.Equal("whsec_test", ep.Secret);

    var list = await client.WebhookEndpoints.ListAsync();
    Assert.Single(list);

    await client.WebhookEndpoints.DeleteAsync("we_1");
    Assert.Equal("DELETE", capturedMethod);
    Assert.Equal("/v1/webhook_endpoints/we_1", capturedPath);

    // Signature verification tests
    var payload = "{\"id\":\"evt_1\"}";
    var secret = "whsec_abc123";
    var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    var sig = Webhooks.ComputeSignature(payload, secret, now);
    var header = $"t={now},v1={sig}";

    Assert.True(Webhooks.VerifySignature(payload, header, secret, 300));
    Assert.False(Webhooks.VerifySignature(payload, header, "wrong_secret", 300));
    Assert.False(Webhooks.VerifySignature(payload, $"t={now - 400},v1={sig}", secret, 300));
  }

  [Fact]
  public async Task Ergonomics_DefaultClientAndShortcutsWork()
  {
    await using var defaultClient = new OpenWrapperClient();
    Assert.NotNull(defaultClient);

    await using var client = CreateClient(req =>
    {
      if (req.Method.Method == "POST" && req.RequestUri?.AbsolutePath == "/v1/payments/pay_1/refunds")
      {
        return JsonResponse(
          """
          {
            "id": "ref_erg",
            "payment_id": "pay_1",
            "amount_minor_units": 750,
            "currency": "EGP",
            "status": "succeeded",
            "created_at": 1725616800
          }
          """,
          HttpStatusCode.Created);
      }
      return JsonResponse("{}", HttpStatusCode.OK);
    });

    // Top-level shortcut with direct numeric amount
    var refund = await client.CreateRefundAsync("pay_1", 750);
    Assert.Equal("ref_erg", refund.Id);
    Assert.Equal(750, refund.AmountMinorUnits);
  }

  [Fact]
  public void Money_ConversionUtilities_ExactCalculations()
  {
    Assert.Equal(1050, Money.ToMinorUnits(10.50m, 2));
    Assert.Equal(-1050, Money.ToMinorUnits(-10.50m, 2));
    Assert.Equal(1, Money.ToMinorUnits(0.01m, 2));
    Assert.Equal(150, Money.ToMinorUnits(150m, 0));
    Assert.Equal(1234, Money.ToMinorUnits(1.234m, 3));

    Assert.Equal("10.50", Money.FormatMajorUnits(1050, 2));
    Assert.Equal("-10.50", Money.FormatMajorUnits(-1050, 2));
    Assert.Equal("0.01", Money.FormatMajorUnits(1, 2));
    Assert.Equal("0.00", Money.FormatMajorUnits(0, 2));
    Assert.Equal("150", Money.FormatMajorUnits(150, 0));
    Assert.Equal("1.234", Money.FormatMajorUnits(1234, 3));
  }

  private static HttpResponseMessage JsonResponse(string json, HttpStatusCode status)
  {
    return new HttpResponseMessage(status)
    {
      Content = new StringContent(json, Encoding.UTF8, "application/json"),
    };
  }

  private sealed class DelayedHandler : HttpMessageHandler
  {
    public int Calls { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(
      HttpRequestMessage request,
      CancellationToken cancellationToken)
    {
      Calls++;
      await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
      throw new InvalidOperationException("unreachable");
    }
  }

  private sealed class ThrowingHandler : HttpMessageHandler
  {
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
      throw new HttpRequestException("ECONNREFUSED");
    }
  }
}
