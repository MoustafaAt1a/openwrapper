# OpenWrapper PHP Standalone Checkout Demo

A minimal, real-world checkout storefront and API backend powered by the official **OpenWrapper PHP SDK** (`openwrapper/sdk`).

---

## Getting Started

### 1. Run the PHP Checkout Server
From this directory:

```bash
php -S 0.0.0.0:4001 server.php
```

Then open your browser at:
**[http://localhost:4001](http://localhost:4001)**

The PHP server provides:
- `/api/checkout` (POST) — Initiates real payments using `OpenWrapperClient->createPayment()`
- `/api/payment-status/{id}` (GET) — Polls resolution using `OpenWrapperClient->getPayment()`
- `/api/health` (GET) — Diagnostic health status
- Static asset serving from `../public/`

---

### 2. Run the CLI Verification Script

To initiate a live payment directly from the command line:

```bash
php test-cli.php
```

---

## PHP SDK Code Example

```php
<?php
require_once __DIR__ . '/../../../sdk/php/vendor_autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: 'http://localhost:3000/api',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
);

$payment = $client->createPayment(new CreatePaymentParams(
    provider: 'paymob', // or 'fawry', 'stripe'
    amountMinorUnits: 15000, // EGP 150.00
    currency: 'EGP',
    customer: new CustomerDetails(
        phone: '+201001234567',
        email: 'customer@example.com',
        fullName: 'Ahmed Ali'
    ),
    merchantReference: 'order_1001',
    description: 'PHP Storefront Demo'
), idempotencyKey: 'order_1001');

echo "Payment ID: " . $payment->paymentId . "\n";
if ($payment->nextAction?->url) {
    echo "Redirect: " . $payment->nextAction->url . "\n";
}
```
