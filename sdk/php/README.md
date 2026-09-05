# openwrapper/sdk (PHP 8.1+)

[![Version](https://img.shields.io/badge/version-0.1.3-blue.svg)](composer.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Official PHP client for the **[OpenWrapper](https://github.com/MoustafaAt1a/openwrapper)** multi-rail payment abstraction platform.

- **PHP 8.1+**: Typed properties, enums, match expressions, and readonly properties.
- **PSR-18 / PSR-17 Compatible**: Works out-of-the-box with native cURL or any standard PSR-18 HTTP client.
- **Stateless Zero-Knowledge**: Passes merchant provider secrets via encrypted TLS headers (`X-Paymob-*`, `X-Fawry-*`, `X-Stripe-*`).
- **Strict Integer Minor-Units**: Avoids floating-point discrepancies in monetary calculations.

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

## Quickstart

```php
<?php
require 'vendor/autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: getenv('OPENWRAPPER_BASE_URL') ?: 'http://localhost:8080',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
    providers: [
        'paymob' => [
            'secret_key' => getenv('PAYMOB_SECRET_KEY'),
            'public_key' => getenv('PAYMOB_PUBLIC_KEY'),
            'hmac_secret' => getenv('PAYMOB_HMAC_SECRET'),
            'integration_id' => getenv('PAYMOB_INTEGRATION_ID'),
        ],
        'fawry' => [
            'merchant_code' => getenv('FAWRY_MERCHANT_CODE'),
            'secure_key' => getenv('FAWRY_SECURE_KEY'),
        ],
        'stripe' => [
            'secret_key' => getenv('STRIPE_SECRET_KEY'),
        ],
    ]
);
```

---

## Payment Creation Recipes

### 1. Paymob 3DS Card (Visa, Mastercard, Meeza)
```php
$payment = $client->createPayment(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 25000, // 250.00 EGP
    currency: 'EGP',
    merchantReference: 'order-1001',
    customer: new CustomerDetails(
        phone: '+201012345678',
        email: 'customer@example.com',
        fullName: 'Omar Tarek'
    )
));

if ($payment->status->value === 'requires_action' && $payment->nextAction?->url) {
    // Redirect customer to 3DS authentication URL
    header('Location: ' . $payment->nextAction->url);
    exit;
}
```

### 2. Fawry Pay Retail Kiosk Code
```php
$fawryPayment = $client->createPayment(new CreatePaymentParams(
    provider: 'fawry',
    amountMinorUnits: 50000, // 500.00 EGP
    currency: 'EGP',
    merchantReference: 'fawry-ref-2001',
    customer: new CustomerDetails(
        phone: '+201211112222',
        fullName: 'Nouran Aly'
    )
));

// 9-digit voucher number generated for cash payment at retail store
$kioskCode = $fawryPayment->providerReference;
echo "Pay at any Fawry retail store with reference: " . $kioskCode;
```

### 3. Stripe Hosted Checkout
```php
$stripePayment = $client->createPayment(new CreatePaymentParams(
    provider: 'stripe',
    amountMinorUnits: 4999, // $49.99 USD
    currency: 'USD',
    customer: new CustomerDetails(email: 'sarah@example.com')
));

echo "Checkout URL: " . $stripePayment->nextAction->url;
```

---

## Error Handling

The client maps HTTP error codes and network failures into explicit PHP exceptions:

```php
use OpenWrapper\Exceptions\OpenWrapperException;
use OpenWrapper\Exceptions\AuthenticationException;
use OpenWrapper\Exceptions\ValidationException;
use OpenWrapper\Exceptions\ConflictException;
use OpenWrapper\Exceptions\GatewayTimeoutException;
use OpenWrapper\Exceptions\GatewayUnreachableException;

try {
    $payment = $client->createPayment($params, idempotencyKey: 'order-uuid-12345');
} catch (AuthenticationException $e) {
    error_log("Invalid OpenWrapper API key: " . $e->getMessage());
} catch (ConflictException $e) {
    error_log("Idempotency key reused with different payload: " . $e->getMessage());
} catch (ValidationException $e) {
    error_log("Invalid request parameters: " . $e->getMessage());
} catch (GatewayTimeoutException $e) {
    error_log("Payment rail timed out. Query payment status to reconcile: " . $e->getMessage());
} catch (GatewayUnreachableException $e) {
    error_log("Cannot reach gateway: " . $e->getMessage());
} catch (OpenWrapperException $e) {
    error_log("Payment failed: " . $e->getMessage());
}
```

---

## Target Base URLs

| Target | `baseUrl` | Notes |
| :--- | :--- | :--- |
| **Rust Gateway** | `http://localhost:8080` | High-performance standalone service (Axum + SQLite/Postgres) |
| **Web Console API Proxy** | `http://localhost:3000/api` | Next.js API route proxying to gateway |
| **Production Gateway** | `https://gateway.example.com` | Production cluster endpoint |

---

## Running Tests

```bash
php tests/run.php
# or with PHPUnit:
vendor/bin/phpunit
```

---

## License

Apache-2.0 © OpenWrapper Contributors
