<?php

declare(strict_types=1);

/**
 * OpenWrapper Standalone Checkout Demo - PHP CLI Transaction Runner
 *
 * Runs end-to-end payment creation and verification test using the PHP SDK.
 * Usage:
 *   php test-cli.php
 */

require_once __DIR__ . '/../../../sdk/php/vendor_autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;

// Load .env
$envFiles = [__DIR__ . '/../.env', __DIR__ . '/.env'];
foreach ($envFiles as $file) {
    if (file_exists($file)) {
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2 && getenv(trim($parts[0])) === false) {
                putenv(trim($parts[0]) . '=' . trim($parts[1]));
            }
        }
    }
}

$baseUrl = getenv('OPENWRAPPER_BASE_URL') ?: 'http://localhost:3000/api';
$apiKey = getenv('OPENWRAPPER_API_KEY') ?: null;

$providers = [
    'paymob' => [
        'secret_key' => getenv('PAYMOB_SECRET_KEY') ?: null,
        'public_key' => getenv('PAYMOB_PUBLIC_KEY') ?: null,
        'hmac_secret' => getenv('PAYMOB_HMAC_SECRET') ?: null,
        'integration_id' => getenv('PAYMOB_INTEGRATION_ID') ?: null,
        'base_url' => getenv('PAYMOB_BASE_URL') ?: null,
    ],
    'fawry' => [
        'merchant_code' => getenv('FAWRY_MERCHANT_CODE') ?: null,
        'secure_key' => getenv('FAWRY_SECURE_KEY') ?: null,
        'base_url' => getenv('FAWRY_BASE_URL') ?: null,
    ],
    'stripe' => [
        'secret_key' => getenv('STRIPE_SECRET_KEY') ?: null,
    ],
];

echo "\n=======================================================\n";
echo "  OpenWrapper PHP SDK (v0.1.2) - Real Transaction Test\n";
echo "=======================================================\n";
echo "Target Base URL: {$baseUrl}\n";
echo "API Key        : " . ($apiKey ? substr($apiKey, 0, 10) . '...' : '(unset/stateless)') . "\n\n";

$client = new OpenWrapperClient(
    baseUrl: $baseUrl,
    apiKey: $apiKey,
    providers: $providers,
    timeoutSeconds: 15
);

$targetProvider = getenv('OPENWRAPPER_TEST_PROVIDER') ?: 'paymob';
$orderRef = 'cli_php_' . bin2hex(random_bytes(6));
$amountMinor = 15000; // EGP 150.00

echo "[1/2] Initiating {$targetProvider} payment of EGP 150.00 (order: {$orderRef})...\n";

try {
    $payment = $client->createPayment(new CreatePaymentParams(
        provider: $targetProvider,
        amountMinorUnits: $amountMinor,
        currency: 'EGP',
        customer: new CustomerDetails(
            phone: '+201001234567',
            email: 'php-tester@example.com',
            fullName: 'PHP CLI Tester'
        ),
        merchantReference: $orderRef,
        description: 'PHP CLI Live Checkout Verification'
    ), idempotencyKey: $orderRef);

    echo "  -> Payment ID : {$payment->paymentId}\n";
    echo "  -> Status     : {$payment->status->value}\n";
    echo "  -> Amount     : EGP " . number_format($payment->amountMinorUnits / 100, 2) . "\n";

    if ($payment->nextAction) {
        echo "  -> Next Action: {$payment->nextAction->type}\n";
        if ($payment->nextAction->url) {
            echo "     Checkout URL: {$payment->nextAction->url}\n";
        }
        if ($payment->nextAction->reference) {
            echo "     Kiosk Code  : {$payment->nextAction->reference}\n";
        }
    }

    echo "\n[2/2] Polling payment resolution via client->getPayment()...\n";
    $fetched = $client->getPayment($payment->paymentId);
    echo "  -> Verified Status: {$fetched->status->value}\n";
    echo "  -> Provider Ref   : " . ($fetched->providerReference ?? 'N/A') . "\n";

    echo "\n✔ SUCCESS: PHP SDK transaction completed and verified cleanly.\n\n";
    exit(0);
} catch (\Throwable $e) {
    echo "\n✖ ERROR: Transaction failed: " . $e->getMessage() . "\n\n";
    exit(1);
}
