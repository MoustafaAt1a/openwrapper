<?php

declare(strict_types=1);

require __DIR__ . '/../vendor_autoload.php';

use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;
use OpenWrapper\Exception\GatewayUnreachableException;
use OpenWrapper\Exception\RateLimitException;
use OpenWrapper\Exception\ValidationException;
use OpenWrapper\OpenWrapperClient;
use OpenWrapper\PaymentStatus;
use OpenWrapper\PayAtReference;
use OpenWrapper\Tests\FakeHttpTransport;
use OpenWrapper\Tests\RetryingHttpTransport;
use OpenWrapper\Tests\ThrowingHttpTransport;
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
        $client->createPayment(new CreatePaymentParams('paymob', -1, 'EGP', new CustomerDetails('1')));
        throw new \RuntimeException('expected ValidationException to be thrown');
    } catch (ValidationException $e) {
        assertSame('invalid amount', $e->getMessage());
        assertSame(400, $e->httpStatus);
        assertSame('validation_error', $e->code());
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
            'paymob' => ['secret_key' => 'pm-secret'],
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

exit($runner->summary());
