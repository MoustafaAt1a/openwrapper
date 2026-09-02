# openwrapper/sdk

PHP client for the [OpenWrapper](https://github.com/MoustafaAt1a/openwrapper) payment gateway.

## Requirements

- PHP 8.1+
- ext-curl, ext-json

## Install

```bash
composer require openwrapper/sdk
```

Or copy `src/` into your project and use `vendor_autoload.php`.

## Quick start

```php
<?php
require 'vendor/autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;

$client = new OpenWrapperClient(
    baseUrl: 'http://localhost:8080',
    apiKey: getenv('OPENWRAPPER_API_KEY') ?: null,
    providers: [
        'paymob' => [
            'secret_key' => getenv('PAYMOB_SECRET_KEY'),
            'public_key' => getenv('PAYMOB_PUBLIC_KEY'),
            'hmac_secret' => getenv('PAYMOB_HMAC_SECRET'),
            'integration_id' => getenv('PAYMOB_INTEGRATION_ID'),
        ],
    ],
);

$payment = $client->createPayment(new CreatePaymentParams(
    provider: 'paymob',
    amountMinorUnits: 1000,
    currency: 'EGP',
    customer: new CustomerDetails(phone: '+201234567890'),
));

echo $payment->status->value;
```

## Base URL

| Deployment | `baseUrl` |
|------------|-----------|
| Rust gateway (Paymob/Fawry) | `http://localhost:8080` |
| Next.js web API (Stripe + gateway proxy) | `http://localhost:3000/api` |

The client appends `/v1` paths automatically. For compatibility, a `baseUrl`
already ending in `/v1` is accepted without duplicating the version segment.

`createPayment()` generates an idempotency key when omitted. Pass a stable key
for application-level retries:

```php
$payment = $client->createPayment($params, idempotencyKey: 'order-123-attempt-1');
```

Transport retries are disabled by default and never retry an HTTP error
response. PHP's synchronous cURL transport enforces `timeoutSeconds`; deadline
failures throw `GatewayTimeoutException` and other transport failures throw
`GatewayUnreachableException`.

## Tests

```bash
php tests/run.php
```

## License

Apache-2.0
