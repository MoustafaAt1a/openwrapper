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

// 1. CLI SAPI Runner
// If run directly from terminal via `php server.php`, automatically launch the built-in web server
if (php_sapi_name() === 'cli') {
    $port = 4001;
    $host = '0.0.0.0';
    $iniFile = file_exists(__DIR__ . '/php.ini') ? (__DIR__ . '/php.ini') : (__DIR__ . '/../php.ini');
    $iniArg = file_exists($iniFile) ? (' -c ' . escapeshellarg($iniFile)) : '';

    printBanner();
    file_put_contents('php://stderr', ">> Starting PHP built-in web server at http://localhost:{$port}\n");
    file_put_contents('php://stderr', ">> Serving real-world checkout demo and API on 0.0.0.0:{$port}\n");
    file_put_contents('php://stderr', ">> Press Ctrl+C to terminate.\n\n");

    putenv('OPENWRAPPER_SUPPRESS_BANNER=1');
    $_ENV['OPENWRAPPER_SUPPRESS_BANNER'] = '1';

    passthru('"' . PHP_BINARY . '"' . "{$iniArg} -S {$host}:{$port} " . escapeshellarg(__FILE__));
    exit(0);
}

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
    'pro' => ['name' => 'OpenWrapper Pro License', 'amountMinorUnits' => 15000, 'currency' => 'EGP'],
    'enterprise' => ['name' => 'Enterprise Gateway License', 'amountMinorUnits' => 45000, 'currency' => 'EGP'],
];

// Simple persistence file for PHP demo transactions in system temp
$STORE_FILE = sys_get_temp_dir() . '/openwrapper_php_demo_txns.json';

function getStoredTransactions(): array {
    global $STORE_FILE;
    if (file_exists($STORE_FILE)) {
        $data = json_decode((string)file_get_contents($STORE_FILE), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveTransaction(string $id, array $data): void {
    global $STORE_FILE;
    $txns = getStoredTransactions();
    $txns[$id] = $data;
    file_put_contents($STORE_FILE, json_encode($txns));
}

// 3. Banner & Request Logging Helpers
function printBanner(): void {
    $port = 4001;
    $baseUrl = getenv('OPENWRAPPER_BASE_URL') ?: 'http://localhost:3000/api';
    $paymobKey = getenv('PAYMOB_SECRET_KEY') ?: '';
    $fawryKey = getenv('FAWRY_SECURE_KEY') ?: '';
    $stripeKey = getenv('STRIPE_SECRET_KEY') ?: '';

    $isPaymob = strlen($paymobKey) > 5 && !str_contains($paymobKey, '...');
    $isFawry = strlen($fawryKey) > 5 && !str_contains($fawryKey, '...');
    $isStripe = strlen($stripeKey) > 5 && str_starts_with($stripeKey, 'sk_');

    $curlOk = extension_loaded('curl');
    $sslOk = extension_loaded('openssl');

    $banner = <<<BANNER
=================================================
 OpenWrapper PHP Standalone Checkout Demo (v0.1.3)
 Server running at: http://localhost:{$port}
 Connected Gateway: {$baseUrl}
 Paymob Key Status: %s
 Fawry Key Status : %s
 Stripe Key Status: %s
 cURL Extension   : %s
 OpenSSL Extension: %s
=================================================

BANNER;

    $out = sprintf(
        $banner,
        $isPaymob ? 'configured' : 'unconfigured (sandbox simulation)',
        $isFawry ? 'configured' : 'unconfigured (sandbox simulation)',
        $isStripe ? 'configured' : 'unconfigured (sandbox simulation)',
        $curlOk ? 'enabled' : 'DISABLED (run with -c php.ini or set PHPRC)',
        $sslOk ? 'enabled' : 'DISABLED (run with -c php.ini or set PHPRC)'
    );
    file_put_contents('php://stderr', $out);
}

function printBannerOnce(): void {
    if (getenv('OPENWRAPPER_SUPPRESS_BANNER') === '1') {
        return;
    }
    $lockFile = sys_get_temp_dir() . '/ow_php_banner_' . md5(__FILE__);
    if (file_exists($lockFile) && (time() - (int)filemtime($lockFile) < 120)) {
        return;
    }
    @touch($lockFile);
    printBanner();
}

printBannerOnce();

function logRequest(int $statusCode, string $path): void {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $time = date('H:i:s');
    $msg = "[{$time}] [PHP Server] {$method} {$path} -> {$statusCode}\n";
    file_put_contents('php://stderr', $msg);
    error_log("[PHP Server] {$method} {$path} -> {$statusCode}");
}

function sendJson(int $statusCode, array $data): void {
    global $uri;
    logRequest($statusCode, $uri ?? '/');
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

if ($uri === '/favicon.ico') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    logRequest(204, $uri);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
    http_response_code(204);
    exit;
}

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
        timeoutSeconds: 15
    );
}

// Direct Provider Real API Helpers
function tryDirectPaymobPhp(array $product, string $provider, string $paymentMethod, string $walletCarrier, string $phone, ?string $email, ?string $fullName, string $merchantRef): ?array {
    $secretKey = getenv('PAYMOB_SECRET_KEY') ?: '';
    $publicKey = getenv('PAYMOB_PUBLIC_KEY') ?: '';
    if ($secretKey === '' || str_contains($secretKey, '...') || str_starts_with($secretKey, 'egy_sk_test_...')) {
        return null;
    }

    $integrationId = ($paymentMethod === 'wallet' && getenv('PAYMOB_WALLET_INTEGRATION_ID'))
        ? getenv('PAYMOB_WALLET_INTEGRATION_ID')
        : (getenv('PAYMOB_INTEGRATION_ID') ?: null);

    $baseUrl = getenv('PAYMOB_BASE_URL') ?: 'https://accept.paymob.com';
    $names = explode(' ', trim($fullName ?? 'Ahmed Ali'), 2);
    $firstName = $names[0] ?? 'Ahmed';
    $lastName = $names[1] ?? 'Ali';

    $payload = [
        'amount' => (int)$product['amountMinorUnits'],
        'currency' => (string)$product['currency'],
        'payment_methods' => $integrationId ? [(int)$integrationId] : ['card'],
        'items' => [
            [
                'name' => (string)$product['name'],
                'amount' => (int)$product['amountMinorUnits'],
                'description' => "PHP SDK Demo: {$product['name']}",
                'quantity' => 1,
            ]
        ],
        'billing_data' => [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone_number' => $phone,
            'email' => $email ?: 'customer@example.com',
            'apartment' => 'NA',
            'floor' => 'NA',
            'street' => 'NA',
            'building' => 'NA',
            'city' => 'Cairo',
            'country' => 'EG',
            'state' => 'Cairo',
        ],
        'special_reference' => $merchantRef,
    ];

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Token {$secretKey}\r\nContent-Type: application/json\r\n",
            'content' => json_encode($payload),
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ]);

    $resp = @file_get_contents("{$baseUrl}/v1/intention/", false, $ctx);
    if ($resp) {
        $data = json_decode($resp, true);
        if (!empty($data['id']) && !empty($data['client_secret'])) {
            $checkoutUrl = "{$baseUrl}/unifiedcheckout/?publicKey={$publicKey}&clientSecret={$data['client_secret']}";
            return [
                'payment_id' => 'paymob_' . $data['id'],
                'paymentId' => 'paymob_' . $data['id'],
                'provider' => 'paymob',
                'status' => 'pending',
                'amount_minor_units' => (int)$product['amountMinorUnits'],
                'amountMinorUnits' => (int)$product['amountMinorUnits'],
                'currency' => (string)$product['currency'],
                'merchant_reference' => $merchantRef,
                'merchantReference' => $merchantRef,
                'provider_reference' => (string)$data['id'],
                'providerReference' => (string)$data['id'],
                'next_action' => [
                    'type' => 'redirect_to_url',
                    'url' => $checkoutUrl,
                ],
                'nextAction' => [
                    'type' => 'redirect_to_url',
                    'url' => $checkoutUrl,
                ],
                'sdk_backend' => 'php',
            ];
        }
    }
    return null;
}

function tryDirectStripePhp(array $product, ?string $email, string $merchantRef): ?array {
    $secretKey = getenv('STRIPE_SECRET_KEY') ?: '';
    if ($secretKey === '' || str_contains($secretKey, '...') || str_starts_with($secretKey, 'sk_test_...')) {
        return null;
    }

    $params = http_build_query([
        'mode' => 'payment',
        'currency' => strtolower((string)$product['currency']),
        'line_items' => [
            [
                'price_data' => [
                    'unit_amount' => (int)$product['amountMinorUnits'],
                    'currency' => strtolower((string)$product['currency']),
                    'product_data' => ['name' => (string)$product['name']],
                ],
                'quantity' => 1,
            ]
        ],
        'customer_email' => $email ?: 'customer@example.com',
        'client_reference_id' => $merchantRef,
        'success_url' => 'http://localhost:4001/?status=success',
        'cancel_url' => 'http://localhost:4001/?status=cancelled',
    ]);

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Bearer {$secretKey}\r\nContent-Type: application/x-www-form-urlencoded\r\n",
            'content' => $params,
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ]);

    $resp = @file_get_contents('https://api.stripe.com/v1/checkout/sessions', false, $ctx);
    if ($resp) {
        $data = json_decode($resp, true);
        if (!empty($data['id']) && !empty($data['url'])) {
            return [
                'payment_id' => 'stripe_' . $data['id'],
                'paymentId' => 'stripe_' . $data['id'],
                'provider' => 'stripe',
                'status' => 'pending',
                'amount_minor_units' => (int)$product['amountMinorUnits'],
                'amountMinorUnits' => (int)$product['amountMinorUnits'],
                'currency' => (string)$product['currency'],
                'merchant_reference' => $merchantRef,
                'merchantReference' => $merchantRef,
                'provider_reference' => $data['id'],
                'providerReference' => $data['id'],
                'next_action' => [
                    'type' => 'redirect_to_url',
                    'url' => $data['url'],
                ],
                'nextAction' => [
                    'type' => 'redirect_to_url',
                    'url' => $data['url'],
                ],
                'sdk_backend' => 'php',
            ];
        }
    }
    return null;
}

function generateSandboxPaymentPhp(array $product, string $provider, string $paymentMethod, string $walletCarrier, string $merchantRef): array {
    $rand = bin2hex(random_bytes(6));
    $paymentId = "pay_sim_{$rand}";

    $nextAction = null;
    $providerRef = null;

    if ($provider === 'fawry') {
        $kioskCode = '929' . mt_rand(100000, 999999);
        $providerRef = "fawry_ref_{$kioskCode}";
        $nextAction = [
            'type' => 'pay_at_reference',
            'reference' => $kioskCode,
            'instructions' => 'Present this 9-digit code at any Fawry retail kiosk or Aman POS terminal across Egypt.',
        ];
    } elseif ($provider === 'stripe') {
        $providerRef = "cs_test_{$rand}";
        $nextAction = [
            'type' => 'redirect_to_url',
            'url' => "https://checkout.stripe.com/c/pay/cs_test_{$rand}",
        ];
    } else {
        $providerRef = "paymob_txn_{$rand}";
        $checkoutUrl = $paymentMethod === 'wallet'
            ? "https://accept.paymob.com/unifiedcheckout/?intention_id=sim_wallet_{$rand}&carrier={$walletCarrier}"
            : "https://accept.paymob.com/unifiedcheckout/?intention_id=sim_card_{$rand}";
        $nextAction = [
            'type' => 'redirect_to_url',
            'url' => $checkoutUrl,
        ];
    }

    return [
        'payment_id' => $paymentId,
        'paymentId' => $paymentId,
        'provider' => $provider,
        'status' => 'pending',
        'amount_minor_units' => (int)$product['amountMinorUnits'],
        'amountMinorUnits' => (int)$product['amountMinorUnits'],
        'currency' => (string)$product['currency'],
        'merchant_reference' => $merchantRef,
        'merchantReference' => $merchantRef,
        'provider_reference' => $providerRef,
        'providerReference' => $providerRef,
        'next_action' => $nextAction,
        'nextAction' => $nextAction,
        'payment_method' => $paymentMethod,
        'wallet_carrier' => $walletCarrier,
        'created_at' => date('c'),
        'sdk_backend' => 'php',
        'simulated' => true,
    ];
}

// 5. API Routing
// Health Check
if ($uri === '/api/health') {
    sendJson(200, [
        'status' => 'ok',
        'sdk' => 'php',
        'runtime' => 'PHP ' . PHP_VERSION,
        'version' => '0.1.3',
        'server' => 'OpenWrapper PHP Standalone Demo',
    ]);
}

// Webhook Settlement Simulator Endpoint (POST /api/simulate-settlement)
if ($uri === '/api/simulate-settlement' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '{}', true);
    $paymentId = $body['payment_id'] ?? ($body['paymentId'] ?? null);

    if (!$paymentId) {
        sendJson(400, ['error' => 'payment_id is required']);
    }

    $txns = getStoredTransactions();
    $record = $txns[$paymentId] ?? [
        'payment_id' => $paymentId,
        'paymentId' => $paymentId,
        'provider' => 'paymob',
        'amount_minor_units' => 15000,
        'currency' => 'EGP',
        'status' => 'pending',
    ];

    $record['status'] = 'succeeded';
    $record['settled_at'] = date('c');
    saveTransaction((string)$paymentId, $record);

    sendJson(200, [
        'success' => true,
        'payment_id' => $paymentId,
        'paymentId' => $paymentId,
        'status' => 'succeeded',
        'settled_at' => $record['settled_at'],
        'message' => 'Payment settled via simulated gateway webhook',
        'sdk_backend' => 'php',
    ]);
}

// Create Payment (supports both /api/checkout and /api/create-payment)
if (($uri === '/api/checkout' || $uri === '/api/create-payment') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '{}', true);

    if (!is_array($body)) {
        sendJson(400, ['error' => 'Invalid JSON request body']);
    }

    $productId = $body['product_id'] ?? ($body['productId'] ?? 'pro');
    global $PRODUCTS;
    $product = $PRODUCTS[$productId] ?? null;
    if (!$product) {
        sendJson(400, ['error' => "Unknown product_id '{$productId}'"]);
    }

    $provider = (string)($body['provider'] ?? 'paymob');
    if (!in_array($provider, ['paymob', 'fawry', 'stripe'], true)) {
        sendJson(400, ['error' => "Unsupported provider '{$provider}'"]);
    }

    $paymentMethod = (string)($body['payment_method'] ?? ($body['paymentMethod'] ?? 'cards'));
    $walletCarrier = (string)($body['wallet_carrier'] ?? ($body['walletCarrier'] ?? 'vodafone'));

    $phone = trim((string)($body['customer']['phone'] ?? ''));
    if ($phone === '') {
        sendJson(400, ['error' => 'Customer phone is required']);
    }
    $email = isset($body['customer']['email']) ? trim((string)$body['customer']['email']) : null;
    $fullName = isset($body['customer']['full_name']) ? trim((string)$body['customer']['full_name']) : null;

    $merchantRef = !empty($body['merchant_reference'])
        ? (string)$body['merchant_reference']
        : (!empty($body['merchantReference']) ? (string)$body['merchantReference'] : 'php_order_' . bin2hex(random_bytes(8)));

    $paymentRecord = null;

    // 1. First Attempt: Call OpenWrapper Client (if Gateway is reachable)
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

        $paymentRecord = [
            'payment_id' => $payment->paymentId,
            'paymentId' => $payment->paymentId,
            'provider' => $payment->provider,
            'status' => $payment->status->value,
            'amount_minor_units' => $payment->amountMinorUnits,
            'amountMinorUnits' => $payment->amountMinorUnits,
            'currency' => $payment->currency,
            'merchant_reference' => $payment->merchantReference,
            'merchantReference' => $payment->merchantReference,
            'provider_reference' => $payment->providerReference,
            'providerReference' => $payment->providerReference,
            'next_action' => $payment->nextAction ? [
                'type' => $payment->nextAction->type,
                'url' => $payment->nextAction->url,
                'reference' => $payment->nextAction->reference,
                'instructions' => $payment->nextAction->instructions,
            ] : null,
            'nextAction' => $payment->nextAction ? [
                'type' => $payment->nextAction->type,
                'url' => $payment->nextAction->url,
                'reference' => $payment->nextAction->reference,
                'instructions' => $payment->nextAction->instructions,
            ] : null,
            'sdk_backend' => 'php',
            'via_gateway' => true,
        ];
    } catch (\Throwable $e) {
        // Gateway not reachable or offline
    }

    // 2. Second Attempt: Direct provider real API call if keys configured
    if (!$paymentRecord) {
        if ($provider === 'paymob') {
            $paymentRecord = tryDirectPaymobPhp($product, $provider, $paymentMethod, $walletCarrier, $phone, $email, $fullName, $merchantRef);
        } elseif ($provider === 'stripe') {
            $paymentRecord = tryDirectStripePhp($product, $email, $merchantRef);
        }
    }

    // 3. Third Attempt: High-fidelity sandbox mock fallback
    if (!$paymentRecord) {
        $paymentRecord = generateSandboxPaymentPhp($product, $provider, $paymentMethod, $walletCarrier, $merchantRef);
    }

    // Persist to session store for status queries and settlement
    saveTransaction((string)$paymentRecord['payment_id'], $paymentRecord);

    sendJson(200, $paymentRecord);
}

// Payment Status Query (supports both /api/payment-status/:id and /api/payment/:id)
if (preg_match('#^/api/(?:payment-status|payment)/([^/]+)$#', $uri, $matches)) {
    $paymentId = urldecode($matches[1]);
    $txns = getStoredTransactions();

    if (isset($txns[$paymentId])) {
        sendJson(200, $txns[$paymentId]);
    }

    try {
        $client = getClient();
        $payment = $client->getPayment($paymentId);
        $record = [
            'payment_id' => $payment->paymentId,
            'paymentId' => $payment->paymentId,
            'status' => $payment->status->value,
            'provider' => $payment->provider,
            'amount_minor_units' => $payment->amountMinorUnits,
            'amountMinorUnits' => $payment->amountMinorUnits,
            'currency' => $payment->currency,
            'provider_reference' => $payment->providerReference,
            'providerReference' => $payment->providerReference,
            'next_action' => $payment->nextAction ? [
                'type' => $payment->nextAction->type,
                'url' => $payment->nextAction->url,
                'reference' => $payment->nextAction->reference,
            ] : null,
            'sdk_backend' => 'php',
        ];
        saveTransaction($paymentId, $record);
        sendJson(200, $record);
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
        logRequest(200, $uri);
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
