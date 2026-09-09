# openwrapper/sdk (PHP 8.1+)

[![Version](https://img.shields.io/badge/version-0.2.7-blue.svg)](composer.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![PHP 8.1+](https://img.shields.io/badge/php-8.1%2B-8892BF.svg)](https://www.php.net/)

Official PHP client for the **[OpenWrapper](https://github.com/MoustafaAt1a/openwrapper)** multi-rail payment abstraction platform.

- **PHP 8.1+**: Typed properties, enums, match expressions, and readonly properties.
- **Zero-Config Default**: Automatically reads `OPENWRAPPER_BASE_URL` and `OPENWRAPPER_API_KEY` from ambient environment variables.
- **Stateless Zero-Knowledge**: Passes merchant provider secrets via encrypted TLS headers (`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`).
- **Strict Integer Minor-Units**: Avoids floating-point discrepancies in monetary calculations (`OpenWrapper\Money`).
- **Full Platform v0.2.7 Parity**: Payments, Refunds, Events audit log, Webhook endpoints, and constant-time signature verification.

---

## Requirements

- PHP 8.1 or higher
- `ext-curl` and `ext-json`

---

## Installation

```bash
composer require openwrapper/sdk
```

*(Alternatively, copy `src/` into your project and include `vendor_autoload.php`.)*

---

## 30-Second Quickstart

```php
<?php
require 'vendor/autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;
use OpenWrapper\Money;

// 1. Initialize client (auto-resolves OPENWRAPPER_BASE_URL & OPENWRAPPER_API_KEY)
$client = new OpenWrapperClient();

// 2. Safely convert currency without floating-point errors (100.50 EGP -> 10050)
$amount = Money::toMinorUnits(100.50);

// 3. Create a payment
$payment = $client->payments->create(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: $amount,
    currency: 'EGP',
    merchantReference: 'order-1001',
    customer: new CustomerDetails(
        phone: '+201012345678',
        email: 'customer@example.com',
        fullName: 'Omar Tarek'
    )
));

echo "Payment created: {$payment->paymentId}, Status: {$payment->status->value}\n";
```

---

## Core Capabilities

### 1. Payments

Both `$client->payments->create(...)` and direct `$client->createPayment(...)` are supported:

```php
// Paymob 3DS Card
$payment = $client->payments->create(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 25000, // 250.00 EGP
    currency: 'EGP',
    merchantReference: 'order-1001',
    customer: new CustomerDetails(phone: '+201012345678', email: 'user@example.com')
));

if ($payment->status->value === 'requires_action' && $payment->nextAction?->url) {
    header('Location: ' . $payment->nextAction->url);
    exit;
}

// Fawry Pay Retail Kiosk Code
$fawry = $client->payments->create(new CreatePaymentParams(
    provider: 'fawry',
    amountMinorUnits: 50000, // 500.00 EGP
    currency: 'EGP',
    customer: new CustomerDetails(phone: '+201211112222', fullName: 'Nouran Aly')
));
echo "Pay at Fawry with reference: {$fawry->providerReference}\n";

// Retrieve Payment
$payment = $client->payments->get('01ABC...');
```

### 2. Refunds & Partial Reversals

```php
// Issue a refund (amount in integer minor units)
$refund = $client->refunds->create(
    paymentId: '01ABC...',
    amountMinorUnits: 5000, // 50.00 EGP
    reason: 'customer_requested'
);

echo "Refund {$refund->id} status: {$refund->status->value}\n";

// List all refunds for a payment
$refunds = $client->refunds->list('01ABC...');
foreach ($refunds as $r) {
    echo "- Refund {$r->id}: {$r->amountMinorUnits} {$r->currency}\n";
}
```

### 3. Events Audit Log

```php
// List events with pagination
$events = $client->events->list(limit: 20);
foreach ($events['data'] as $evt) {
    echo "Event: {$evt->eventType} on {$evt->resourceId}\n";
}

// Fetch single event
$evt = $client->events->get('evt_123');
```

### 4. Merchant Webhooks & Verification

```php
use OpenWrapper\Webhooks;

// Register webhook endpoint in OpenWrapper
$endpoint = $client->webhookEndpoints->create(
    url: 'https://example.com/api/webhooks/openwrapper',
    events: ['payment.succeeded', 'refund.created']
);
echo "Webhook secret: {$endpoint->secret}\n";

// In your webhook receiver controller:
$payload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_OPENWRAPPER_SIGNATURE'] ?? '';
$secret = 'whsec_...';

if (!Webhooks::verifySignature($payload, $signatureHeader, $secret)) {
    http_response_code(400);
    exit('Invalid signature');
}

// Signature is valid and verified using constant-time comparison
$data = json_decode($payload, true);
```

### 5. Safe Currency Math (`OpenWrapper\Money`)

Never use floating-point math for money. OpenWrapper provides clean integer conversion helpers:

```php
use OpenWrapper\Money;

// Convert decimal to minor units
$minor = Money::toMinorUnits(10.50);     // 1050
$minor = Money::toMinorUnits("10.50");   // 1050
$minor = Money::toMinorUnits(1.5, 3);    // 1500 (3 decimal places, e.g. KWD)

// Format minor units to human-readable string
$display = Money::formatMajorUnits(1050); // "10.50"
$display = Money::formatMajorUnits(5);    // "0.05"
```

---

## Error Handling

The client maps HTTP error codes into specific, strongly-typed exceptions:

```php
use OpenWrapper\Exception\OpenWrapperException;
use OpenWrapper\Exception\AuthenticationException;
use OpenWrapper\Exception\ValidationException;
use OpenWrapper\Exception\IdempotencyConflictException;
use OpenWrapper\Exception\RateLimitException;
use OpenWrapper\Exception\GatewayTimeoutException;
use OpenWrapper\Exception\GatewayUnreachableException;

try {
    $payment = $client->payments->create($params, idempotencyKey: 'order-uuid-12345');
} catch (AuthenticationException $e) {
    error_log("Invalid OpenWrapper API key: " . $e->getMessage());
} catch (IdempotencyConflictException $e) {
    error_log("Idempotency key reused with different payload: " . $e->getMessage());
} catch (ValidationException $e) {
    error_log("Invalid request parameters: " . $e->getMessage());
} catch (RateLimitException $e) {
    error_log("Rate limit exceeded: " . $e->getMessage());
} catch (GatewayTimeoutException $e) {
    error_log("Payment rail timed out. Query payment status to reconcile: " . $e->getMessage());
} catch (GatewayUnreachableException $e) {
    error_log("Cannot reach OpenWrapper gateway: " . $e->getMessage());
} catch (OpenWrapperException $e) {
    error_log("Platform error: " . $e->getMessage());
}
```

---

## Running Tests

```bash
php tests/run.php
```

---

## License

Apache-2.0 © OpenWrapper Contributors
