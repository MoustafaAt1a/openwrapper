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

echo $payment->status;
```

## Base URL

| Deployment | `baseUrl` |
|------------|-----------|
| Rust gateway (Paymob/Fawry) | `http://localhost:8080` |
| Next.js web API (Stripe) | `http://localhost:3000/api/v1` |

## Tests

```bash
php tests/run.php
```

## License

Apache-2.0
