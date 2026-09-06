<?php

declare(strict_types=1);

require __DIR__ . '/../vendor_autoload.php';

use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;
use OpenWrapper\Exception\GatewayTimeoutException;
use OpenWrapper\Exception\GatewayUnreachableException;
use OpenWrapper\Exception\IdempotencyConflictException;
use OpenWrapper\Exception\RateLimitException;
use OpenWrapper\Exception\ValidationException;
use OpenWrapper\OpenWrapperClient;
use OpenWrapper\PaymentStatus;
use OpenWrapper\PayAtReference;
use OpenWrapper\RedirectToUrl;
use OpenWrapper\Http\TransportResponse;
use OpenWrapper\Tests\CallbackHttpTransport;
use OpenWrapper\Tests\FakeHttpTransport;
use OpenWrapper\Tests\RetryingHttpTransport;
use OpenWrapper\Tests\ThrowingHttpTransport;
use OpenWrapper\Tests\TimeoutHttpTransport;
use function OpenWrapper\Tests\assertFalse;
use function OpenWrapper\Tests\assertInstanceOf;
use function OpenWrapper\Tests\assertSame;
use function OpenWrapper\Tests\assertTrue;

$runner = new \OpenWrapper\Tests\TestRunner();

$runner->run('create() sends an Idempotency-Key header even when the caller supplies none', function () {
    $transport = new FakeHttpTransport(201, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'fawry',
        'provider_reference' => 'MR-1',
        'status' => 'pending',
        'amount_minor_units' => 1000,
        'currency' => 'EGP',
        'merchant_reference' => null,
        'next_action' => ['type' => 'pay_at_reference', 'reference' => '123456', 'instructions' => 'Pay at any Fawry outlet'],
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    $payment = $client->createPayment(new CreatePaymentParams(
        provider: 'fawry',
        amountMinorUnits: 1000,
        currency: 'EGP',
        customer: new CustomerDetails(phone: '+201234567890'),
    ));

    assertTrue(!empty($transport->lastRequest['headers']['Idempotency-Key']), 'Idempotency-Key header must always be present');
    assertSame('01ABC', $payment->paymentId);
    assertSame(PaymentStatus::Pending, $payment->status);
    assertInstanceOf(PayAtReference::class, $payment->nextAction);
    assertSame('123456', $payment->nextAction->reference);
});

$runner->run('caller-supplied idempotency key is passed through unchanged', function () {
    $transport = new FakeHttpTransport(201, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'paymob',
        'provider_reference' => 'txn-1',
        'status' => 'pending',
        'amount_minor_units' => 500,
        'currency' => 'EGP',
        'merchant_reference' => 'order-7',
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    $client->createPayment(
        new CreatePaymentParams('paymob', 500, 'EGP', new CustomerDetails('+2010')),
        idempotencyKey: 'order-7',
    );

    assertSame('order-7', $transport->lastRequest['headers']['Idempotency-Key']);
});

$runner->run('a 400 validation response is thrown as ValidationException with the server message', function () {
    $transport = new FakeHttpTransport(400, json_encode([
        'error' => ['code' => 'validation_error', 'message' => 'invalid amount'],
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    try {
        $client->createPayment(new CreatePaymentParams('paymob', 1, 'EGP', new CustomerDetails('1')));
        throw new \RuntimeException('expected ValidationException to be thrown');
    } catch (ValidationException $e) {
        assertSame('invalid amount', $e->getMessage());
        assertSame(400, $e->httpStatus);
        assertSame('validation_error', $e->code());
    }
});

$runner->run('a 409 response is thrown as IdempotencyConflictException', function () {
    $transport = new FakeHttpTransport(409, json_encode([
        'error' => ['code' => 'idempotency_conflict', 'message' => 'idempotency key reused with different request payload'],
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    try {
        $client->createPayment(new CreatePaymentParams('paymob', 1000, 'EGP', new CustomerDetails('+201000000000')));
        throw new \RuntimeException('expected IdempotencyConflictException to be thrown');
    } catch (IdempotencyConflictException $e) {
        assertSame('idempotency key reused with different request payload', $e->getMessage());
        assertSame(409, $e->httpStatus);
        assertSame('idempotency_conflict', $e->code());
    }
});

$runner->run('a 429 response is thrown as RateLimitException', function () {
    $transport = new FakeHttpTransport(429, json_encode([
        'error' => ['code' => 'rate_limit', 'message' => 'slow down'],
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    try {
        $client->getPayment('01ABC');
        throw new \RuntimeException('expected RateLimitException to be thrown');
    } catch (RateLimitException $e) {
        assertSame(429, $e->httpStatus);
    }
});

$runner->run('a transport failure reaching the gateway itself throws GatewayUnreachableException', function () {
    $client = new OpenWrapperClient('https://gateway.test', transport: new ThrowingHttpTransport());
    try {
        $client->getPayment('01ABC');
        throw new \RuntimeException('expected GatewayUnreachableException to be thrown');
    } catch (GatewayUnreachableException $e) {
        assertTrue(str_contains($e->getMessage(), 'ECONNREFUSED'));
    }
});

$runner->run('an unknown-outcome payment is a normal return value, not a thrown exception', function () {
    $transport = new FakeHttpTransport(200, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'paymob',
        'provider_reference' => null,
        'status' => 'unknown',
        'amount_minor_units' => 1000,
        'currency' => 'EGP',
        'merchant_reference' => null,
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    $payment = $client->getPayment('01ABC');
    assertSame(PaymentStatus::Unknown, $payment->status);
});

$runner->run('apiKey parameter is sent as X-API-Key header in requests', function () {
    $transport = new FakeHttpTransport(200, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'paymob',
        'provider_reference' => null,
        'status' => 'pending',
        'amount_minor_units' => 1000,
        'currency' => 'EGP',
        'merchant_reference' => null,
    ]));
    $client = new OpenWrapperClient('https://gateway.test', apiKey: 'test-php-api-key', transport: $transport);

    $client->getPayment('01ABC');
    assertSame('test-php-api-key', $transport->lastRequest['headers']['X-API-Key']);
});

$runner->run('CreatePaymentParams serializes to the exact wire shape the gateway expects', function () {
    $params = new CreatePaymentParams(
        provider: 'paymob',
        amountMinorUnits: 12345,
        currency: 'EGP',
        customer: new CustomerDetails(phone: '+201000000000', email: 'a@b.com', fullName: 'A B'),
        merchantReference: 'ref-1',
    );
    $wire = $params->toWire();
    assertSame('paymob', $wire['provider']);
    assertSame(12345, $wire['amount_minor_units']);
    assertSame('+201000000000', $wire['customer']['phone']);
    assertSame('a@b.com', $wire['customer']['email']);
    assertSame('ref-1', $wire['merchant_reference']);
    assertTrue(str_contains(json_encode($wire), '"metadata":{}'), 'metadata should serialize as empty JSON object');
});

$runner->run('provider credential headers are sent on create()', function () {
    $transport = new FakeHttpTransport(200, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'stripe',
        'provider_reference' => 'cs_test_1',
        'status' => 'pending',
        'amount_minor_units' => 1000,
        'currency' => 'USD',
        'merchant_reference' => null,
    ]));
    $client = new OpenWrapperClient(
        'https://gateway.test',
        providers: [
            'paymob' => ['secret_key' => 'pm-secret', 'base_url' => 'https://paymob.test'],
            'fawry' => ['merchant_code' => 'MC', 'secure_key' => 'fw-secret'],
            'stripe' => ['secret_key' => 'sk_test_123'],
        ],
        transport: $transport,
    );

    $client->createPayment(new CreatePaymentParams(
        provider: 'stripe',
        amountMinorUnits: 1000,
        currency: 'USD',
        customer: new CustomerDetails(phone: '+201000000000'),
    ));

    assertSame('pm-secret', $transport->lastRequest['headers']['X-Paymob-Secret-Key'] ?? null);
    assertSame('https://paymob.test', $transport->lastRequest['headers']['X-Paymob-Base-Url'] ?? null);
    assertSame('MC', $transport->lastRequest['headers']['X-Fawry-Merchant-Code'] ?? null);
    assertSame('sk_test_123', $transport->lastRequest['headers']['X-Stripe-Secret-Key'] ?? null);
});

$runner->run('client retries transient network errors up to maxRetries', function () {
    $transport = new RetryingHttpTransport(
        failuresBeforeSuccess: 2,
        responseStatus: 200,
        responseBody: json_encode([
            'payment_id' => '01ABC',
            'provider' => 'paymob',
            'provider_reference' => null,
            'status' => 'pending',
            'amount_minor_units' => 1000,
            'currency' => 'EGP',
            'merchant_reference' => null,
        ])
    );
    $client = new OpenWrapperClient('https://gateway.test', maxRetries: 2, retryDelayMs: 1, transport: $transport);

    $payment = $client->getPayment('01ABC');
    assertSame(3, $transport->calls);
    assertSame('01ABC', $payment->paymentId);
});

$runner->run('already-versioned base URLs are not duplicated and payment IDs are path-encoded', function () {
    $transport = new FakeHttpTransport(200, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'paymob',
        'provider_reference' => null,
        'status' => 'pending',
        'amount_minor_units' => 1000,
        'currency' => 'EGP',
        'merchant_reference' => null,
    ]));
    $client = new OpenWrapperClient('https://gateway.test/api/v1/', transport: $transport);

    $client->getPayment('part/other');
    assertSame('https://gateway.test/api/v1/payments/part%2Fother', $transport->lastRequest['url']);
});

$runner->run('per-call provider credentials merge field-by-field', function () {
    $transport = new FakeHttpTransport(200, json_encode([
        'payment_id' => '01ABC',
        'provider' => 'paymob',
        'provider_reference' => null,
        'status' => 'pending',
        'amount_minor_units' => 1000,
        'currency' => 'EGP',
        'merchant_reference' => null,
    ]));
    $client = new OpenWrapperClient(
        'https://gateway.test',
        providers: ['paymob' => ['secret_key' => 'default-secret', 'public_key' => 'default-public']],
        transport: $transport,
    );

    $client->createPayment(
        new CreatePaymentParams('paymob', 1000, 'EGP', new CustomerDetails('+2010')),
        providers: ['paymob' => ['public_key' => 'override-public']],
    );
    assertSame('default-secret', $transport->lastRequest['headers']['X-Paymob-Secret-Key'] ?? null);
    assertSame('override-public', $transport->lastRequest['headers']['X-Paymob-Public-Key'] ?? null);
});

$runner->run('invalid amounts and idempotency keys fail before sending', function () {
    $transport = new FakeHttpTransport(500, '{}');
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    try {
        $client->createPayment(new CreatePaymentParams('paymob', 0, 'EGP', new CustomerDetails('+2010')));
        throw new \RuntimeException('expected invalid amount rejection');
    } catch (\InvalidArgumentException) {
        assertSame(null, $transport->lastRequest);
    }

    try {
        $client->createPayment(
            new CreatePaymentParams('paymob', 1, 'EGP', new CustomerDetails('+2010')),
            idempotencyKey: 'has space',
        );
        throw new \RuntimeException('expected invalid idempotency key rejection');
    } catch (\InvalidArgumentException) {
        assertSame(null, $transport->lastRequest);
    }
});

$runner->run('proxy validation codes map to ValidationException', function () {
    $transport = new FakeHttpTransport(422, json_encode([
        'error' => ['code' => 'missing_provider_credentials', 'message' => 'credentials required'],
    ]));
    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);

    try {
        $client->getPayment('01ABC');
        throw new \RuntimeException('expected ValidationException');
    } catch (ValidationException $e) {
        assertSame(422, $e->httpStatus);
    }
});

$runner->run('transport timeouts throw GatewayTimeoutException', function () {
    $client = new OpenWrapperClient('https://gateway.test', transport: new TimeoutHttpTransport());
    try {
        $client->getPayment('01ABC');
        throw new \RuntimeException('expected GatewayTimeoutException');
    } catch (GatewayTimeoutException $e) {
        assertSame('gateway_timeout', $e->code());
    }
});

$runner->run('next-action subclasses are independently PSR-4 loadable', function () {
    assertTrue(class_exists(RedirectToUrl::class));
    assertTrue(class_exists(PayAtReference::class));
});

$runner->run('Payment::fromWire safely parses responses omitting optional fields without warnings', function () {
    $payment = \OpenWrapper\Payment::fromWire([
        'payment_id' => '01DEF',
        'provider' => 'stripe',
        'status' => 'succeeded',
        'amount_minor_units' => 4500,
        'currency' => 'USD',
    ]);
    assertSame('01DEF', $payment->paymentId);
    assertSame('stripe', $payment->provider);
    assertSame(null, $payment->providerReference);
    assertSame(\OpenWrapper\PaymentStatus::Succeeded, $payment->status);
    assertSame(4500, $payment->amountMinorUnits);
    assertSame('USD', $payment->currency);
    assertSame(null, $payment->merchantReference);
    assertSame(null, $payment->nextAction);
});

$runner->run('PaymentNextAction::fromWire handles redirect_to_url and pay_at_reference defensively', function () {
    $redirect = \OpenWrapper\PaymentNextAction::fromWire([
        'type' => 'redirect_to_url',
        'url' => 'https://checkout.test/pay',
    ]);
    assertInstanceOf(RedirectToUrl::class, $redirect);
    assertSame('https://checkout.test/pay', $redirect->url);

    $kiosk = \OpenWrapper\PaymentNextAction::fromWire([
        'type' => 'pay_at_reference',
        'reference' => '998877',
    ]);
    assertInstanceOf(PayAtReference::class, $kiosk);
    assertSame('998877', $kiosk->reference);
    assertSame(null, $kiosk->instructions);
});

$runner->run('refunds: createRefund and listRefunds call correct endpoints and parse wire model', function () {
    $transport = new CallbackHttpTransport(function (string $method, string $url, array $headers, ?string $body) {
        if ($method === 'POST' && str_ends_with($url, '/v1/payments/pay_1/refunds')) {
            assertSame('ref-idemp-1', $headers['Idempotency-Key'] ?? null);
            return new TransportResponse(201, json_encode([
                'id' => 'ref_1',
                'payment_id' => 'pay_1',
                'amount_minor_units' => 500,
                'currency' => 'EGP',
                'status' => 'succeeded',
                'reason' => 'customer_requested',
                'created_at' => 1725616800,
            ], JSON_THROW_ON_ERROR));
        }
        if ($method === 'GET' && str_ends_with($url, '/v1/payments/pay_1/refunds')) {
            return new TransportResponse(200, json_encode([
                'data' => [
                    [
                        'id' => 'ref_1',
                        'payment_id' => 'pay_1',
                        'amount_minor_units' => 500,
                        'currency' => 'EGP',
                        'status' => 'succeeded',
                        'created_at' => 1725616800,
                    ],
                ],
            ], JSON_THROW_ON_ERROR));
        }
        return new TransportResponse(404, 'not found');
    });

    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);
    $refund = $client->createRefund('pay_1', 500, 'customer_requested', 'ref-idemp-1');
    assertSame('ref_1', $refund->id);
    assertSame('pay_1', $refund->paymentId);
    assertSame(500, $refund->amountMinorUnits);
    assertSame(\OpenWrapper\RefundStatus::Succeeded, $refund->status);

    $list = $client->listRefunds('pay_1');
    assertSame(1, count($list));
    assertSame('ref_1', $list[0]->id);
});

$runner->run('events: listEvents and getEvent call correct endpoints', function () {
    $transport = new CallbackHttpTransport(function (string $method, string $url) {
        if (str_contains($url, '/v1/events?limit=10&starting_after=evt_0')) {
            return new TransportResponse(200, json_encode([
                'data' => [
                    [
                        'id' => 'evt_1',
                        'event_type' => 'payment.created',
                        'resource_id' => 'pay_1',
                        'payload' => ['payment_id' => 'pay_1'],
                        'created_at' => 1725616800,
                    ],
                ],
                'has_more' => false,
            ], JSON_THROW_ON_ERROR));
        }
        if (str_ends_with($url, '/v1/events/evt_1')) {
            return new TransportResponse(200, json_encode([
                'id' => 'evt_1',
                'event_type' => 'payment.created',
                'resource_id' => 'pay_1',
                'payload' => ['payment_id' => 'pay_1'],
                'created_at' => 1725616800,
            ], JSON_THROW_ON_ERROR));
        }
        return new TransportResponse(404, 'not found');
    });

    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);
    $env = $client->listEvents(10, 'evt_0');
    assertSame(1, count($env['data']));
    assertSame('evt_1', $env['data'][0]->id);
    assertSame('payment.created', $env['data'][0]->eventType);
    assertFalse($env['has_more']);

    $evt = $client->getEvent('evt_1');
    assertSame('evt_1', $evt->id);
    assertSame('payment.created', $evt->eventType);
});

$runner->run('webhookEndpoints and signature verification', function () {
    $deletedId = null;
    $transport = new CallbackHttpTransport(function (string $method, string $url, array $headers, ?string $body) use (&$deletedId) {
        if ($method === 'POST' && str_ends_with($url, '/v1/webhook_endpoints')) {
            return new TransportResponse(201, json_encode([
                'id' => 'we_1',
                'url' => 'https://example.com/webhook',
                'secret' => 'whsec_test123',
                'events' => ['payment.created'],
                'is_active' => true,
                'created_at' => 1725616800,
            ], JSON_THROW_ON_ERROR));
        }
        if ($method === 'GET' && str_ends_with($url, '/v1/webhook_endpoints')) {
            return new TransportResponse(200, json_encode([
                'data' => [
                    [
                        'id' => 'we_1',
                        'url' => 'https://example.com/webhook',
                        'events' => ['payment.created'],
                        'is_active' => true,
                        'created_at' => 1725616800,
                    ],
                ],
            ], JSON_THROW_ON_ERROR));
        }
        if ($method === 'DELETE' && str_ends_with($url, '/v1/webhook_endpoints/we_1')) {
            $deletedId = 'we_1';
            return new TransportResponse(204, '');
        }
        return new TransportResponse(404, 'not found');
    });

    $client = new OpenWrapperClient('https://gateway.test', transport: $transport);
    $ep = $client->createWebhookEndpoint('https://example.com/webhook', ['payment.created']);
    assertSame('we_1', $ep->id);
    assertSame('whsec_test123', $ep->secret);

    $list = $client->listWebhookEndpoints();
    assertSame(1, count($list));

    $client->deleteWebhookEndpoint('we_1');
    assertSame('we_1', $deletedId);

    // Signature verification
    $payload = '{"id":"evt_1"}';
    $secret = 'whsec_test_secret_123';
    $now = time();
    $sig = \OpenWrapper\Webhooks::computeSignature($payload, $secret, $now);
    $header = "t={$now},v1={$sig}";

    assertTrue(\OpenWrapper\Webhooks::verifySignature($payload, $header, $secret, 300));
    assertFalse(\OpenWrapper\Webhooks::verifySignature($payload, $header, 'wrong_secret', 300));
    assertFalse(\OpenWrapper\Webhooks::verifySignature($payload, "t=" . ($now - 400) . ",v1={$sig}", $secret, 300));
});

$runner->run('Money utility safely converts and formats currency without floating-point errors', function () {
    assertSame(1050, \OpenWrapper\Money::toMinorUnits(10.50));
    assertSame(1050, \OpenWrapper\Money::toMinorUnits('10.50'));
    assertSame(1050, \OpenWrapper\Money::toMinorUnits('10.5'));
    assertSame(1000, \OpenWrapper\Money::toMinorUnits(10));
    assertSame(1000, \OpenWrapper\Money::toMinorUnits('10'));
    assertSame(-1050, \OpenWrapper\Money::toMinorUnits(-10.50));
    assertSame(-1050, \OpenWrapper\Money::toMinorUnits('-10.50'));
    assertSame(150, \OpenWrapper\Money::toMinorUnits(1.5, 2));
    assertSame(1500, \OpenWrapper\Money::toMinorUnits(1.5, 3));

    assertSame('10.50', \OpenWrapper\Money::formatMajorUnits(1050));
    assertSame('0.05', \OpenWrapper\Money::formatMajorUnits(5));
    assertSame('0.00', \OpenWrapper\Money::formatMajorUnits(0));
    assertSame('-10.50', \OpenWrapper\Money::formatMajorUnits(-1050));
    assertSame('1.500', \OpenWrapper\Money::formatMajorUnits(1500, 3));
    assertSame('100', \OpenWrapper\Money::formatMajorUnits(100, 0));
});

$runner->run('client default constructor resolves environment variables and property accessors proxy to methods', function () {
    putenv('OPENWRAPPER_BASE_URL=https://env-gateway.test');
    putenv('OPENWRAPPER_API_KEY=ow_env_key_123');

    $transport = new CallbackHttpTransport(function (string $method, string $url, array $headers, ?string $body) {
        assertSame('ow_env_key_123', $headers['X-API-Key'] ?? null);
        assertTrue(str_starts_with($url, 'https://env-gateway.test/v1/'));
        if (str_ends_with($url, '/v1/payments/pay_proxy_1')) {
            return new TransportResponse(200, json_encode([
                'payment_id' => 'pay_proxy_1',
                'provider' => 'mock',
                'status' => 'succeeded',
                'amount_minor_units' => 2000,
                'currency' => 'USD',
            ], JSON_THROW_ON_ERROR));
        }
        if (str_ends_with($url, '/v1/payments/pay_proxy_1/refunds') && $method === 'POST') {
            return new TransportResponse(201, json_encode([
                'id' => 'ref_proxy_1',
                'payment_id' => 'pay_proxy_1',
                'amount_minor_units' => 1000,
                'currency' => 'USD',
                'status' => 'succeeded',
                'created_at' => 1725616800,
            ], JSON_THROW_ON_ERROR));
        }
        return new TransportResponse(404, 'not found');
    });

    $client = new OpenWrapperClient(transport: $transport);

    // Test proxy properties: $client->payments, $client->refunds
    $p = $client->payments->get('pay_proxy_1');
    assertSame('pay_proxy_1', $p->paymentId);
    assertSame(2000, $p->amountMinorUnits);

    $ref = $client->refunds->create('pay_proxy_1', 1000);
    assertSame('ref_proxy_1', $ref->id);
    assertSame(1000, $ref->amountMinorUnits);

    putenv('OPENWRAPPER_BASE_URL');
    putenv('OPENWRAPPER_API_KEY');
});

exit($runner->summary());
