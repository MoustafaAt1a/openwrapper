<?php

declare(strict_types=1);

/**
 * OpenWrapper Standalone Checkout Demo - PHP 8 Backend Server
 *
 * Runs with PHP built-in web server:
 *   php -S 0.0.0.0:4001 server.php
 */

require_once __DIR__ . '/../../../sdk/php/vendor_autoload.php';

use OpenWrapper\OpenWrapperClient;
use OpenWrapper\CreatePaymentParams;
use OpenWrapper\CustomerDetails;
use OpenWrapper\Exception\OpenWrapperException;

// 1. Environment Loading Helper
function loadEnvFile(string $path): void {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            if (getenv($key) === false) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
            }
        }
    }
}

loadEnvFile(__DIR__ . '/../.env');
loadEnvFile(__DIR__ . '/.env');

// 2. Global Products Definition
$PRODUCTS = [
    'starter' => ['name' => 'Starter Developer Tier', 'amountMinorUnits' => 5000, 'currency' => 'EGP'],
    'pro' => ['name' => 'OpenWrapper Pro Plan', 'amountMinorUnits' => 15000, 'currency' => 'EGP'],
    'enterprise' => ['name' => 'Enterprise Gateway License', 'amountMinorUnits' => 45000, 'currency' => 'EGP'],
];

// 3. CORS & Response Helpers
function sendJson(int $statusCode, array $data): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// 4. Initialize PHP SDK Client
function getClient(): OpenWrapperClient {
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

    return new OpenWrapperClient(
        baseUrl: $baseUrl,
        apiKey: $apiKey,
        providers: $providers,
        timeoutSeconds: 20
    );
}

// 5. API Routing
// Health Check
if ($uri === '/api/health') {
    sendJson(200, [
        'status' => 'ok',
        'sdk' => 'php',
        'runtime' => 'PHP ' . PHP_VERSION,
        'version' => '0.1.2',
        'server' => 'OpenWrapper PHP Standalone Demo',
    ]);
}

// Create Payment (supports both /api/checkout and /api/create-payment)
if (($uri === '/api/checkout' || $uri === '/api/create-payment') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '{}', true);

    if (!is_array($body)) {
        sendJson(400, ['error' => 'Invalid JSON request body']);
    }

    $productId = $body['product_id'] ?? 'pro';
    global $PRODUCTS;
    $product = $PRODUCTS[$productId] ?? null;
    if (!$product) {
        sendJson(400, ['error' => "Unknown product_id '{$productId}'"]);
    }

    $provider = (string)($body['provider'] ?? 'paymob');
    if (!in_array($provider, ['paymob', 'fawry', 'stripe'], true)) {
        sendJson(400, ['error' => "Unsupported provider '{$provider}'"]);
    }

    $phone = trim((string)($body['customer']['phone'] ?? ''));
    if ($phone === '') {
        sendJson(400, ['error' => 'Customer phone is required']);
    }
    $email = isset($body['customer']['email']) ? trim((string)$body['customer']['email']) : null;
    $fullName = isset($body['customer']['full_name']) ? trim((string)$body['customer']['full_name']) : null;

    $merchantRef = !empty($body['merchant_reference'])
        ? (string)$body['merchant_reference']
        : 'php_order_' . bin2hex(random_bytes(8));

    try {
        $client = getClient();
        $params = new CreatePaymentParams(
            provider: $provider,
            amountMinorUnits: (int)$product['amountMinorUnits'],
            currency: (string)$product['currency'],
            customer: new CustomerDetails(
                phone: $phone,
                email: $email,
                fullName: $fullName
            ),
            merchantReference: $merchantRef,
            description: "PHP SDK Demo: {$product['name']}"
        );

        $payment = $client->createPayment($params, idempotencyKey: $merchantRef);

        sendJson(200, [
            'payment_id' => $payment->paymentId,
            'provider' => $payment->provider,
            'status' => $payment->status->value,
            'amount_minor_units' => $payment->amountMinorUnits,
            'currency' => $payment->currency,
            'merchant_reference' => $payment->merchantReference,
            'provider_reference' => $payment->providerReference,
            'next_action' => $payment->nextAction ? [
                'type' => $payment->nextAction->type,
                'url' => $payment->nextAction->url,
                'reference' => $payment->nextAction->reference,
                'instructions' => $payment->nextAction->instructions,
            ] : null,
            'sdk_backend' => 'php',
        ]);
    } catch (OpenWrapperException $e) {
        sendJson(400, [
            'error' => $e->getMessage(),
            'code' => $e->errorCode,
            'sdk_backend' => 'php',
        ]);
    } catch (\Throwable $e) {
        sendJson(500, [
            'error' => 'Unexpected PHP server error: ' . $e->getMessage(),
            'sdk_backend' => 'php',
        ]);
    }
}

// Payment Status Query (supports both /api/payment-status/:id and /api/payment/:id)
if (preg_match('#^/api/(?:payment-status|payment)/([^/]+)$#', $uri, $matches)) {
    $paymentId = urldecode($matches[1]);
    try {
        $client = getClient();
        $payment = $client->getPayment($paymentId);
        sendJson(200, [
            'payment_id' => $payment->paymentId,
            'status' => $payment->status->value,
            'provider' => $payment->provider,
            'amount_minor_units' => $payment->amountMinorUnits,
            'currency' => $payment->currency,
            'provider_reference' => $payment->providerReference,
            'next_action' => $payment->nextAction ? [
                'type' => $payment->nextAction->type,
                'url' => $payment->nextAction->url,
                'reference' => $payment->nextAction->reference,
            ] : null,
            'sdk_backend' => 'php',
        ]);
    } catch (\Throwable $e) {
        sendJson(404, [
            'error' => 'Failed to resolve payment status: ' . $e->getMessage(),
            'sdk_backend' => 'php',
        ]);
    }
}

// 6. Static Files Server (serves ../public/ assets)
$publicDir = realpath(__DIR__ . '/../public');
if ($publicDir) {
    $filePath = $publicDir . ($uri === '/' ? '/index.html' : $uri);
    if (file_exists($filePath) && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'html' => 'text/html; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'js' => 'application/javascript; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'ico' => 'image/x-icon',
        ];
        header('Content-Type: ' . ($mimes[$ext] ?? 'text/plain'));
        readfile($filePath);
        exit;
    }
}

// Fallback 404
sendJson(404, ['error' => "Route not found: {$uri}"]);
