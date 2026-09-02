<?php

declare(strict_types=1);

namespace OpenWrapper;

use OpenWrapper\Exception\ExceptionFactory;
use OpenWrapper\Exception\GatewayTimeoutException;
use OpenWrapper\Exception\GatewayUnreachableException;
use OpenWrapper\Http\CurlHttpTransport;
use OpenWrapper\Http\HttpTransport;
use OpenWrapper\Http\TransportException;

final class OpenWrapperClient
{
    private readonly string $baseUrl;
    private readonly ?string $apiKey;
    /** @var array<string, mixed>|null */
    private readonly ?array $providers;
    private readonly int $maxRetries;
    private readonly int $retryDelayMs;
    private readonly HttpTransport $transport;
    private readonly int $timeoutSeconds;

    /**
     * @param string $baseUrl Absolute HTTP(S) base URL. Root URLs and URLs ending in /v1 are accepted.
     * @param string|null $apiKey Your OpenWrapper API Key ('ow_live_...')
     * @param array<string, mixed>|null $providers Optional merchant credentials for Paymob, Fawry, Stripe
     * @param int $maxRetries Maximum retry attempts for transient errors
     * @param int $retryDelayMs Base delay for exponential backoff
     * @param HttpTransport|null $transport Custom HTTP transport
     * @param int $timeoutSeconds Request timeout in seconds
     */
    public function __construct(
        string $baseUrl,
        ?string $apiKey = null,
        ?array $providers = null,
        int $maxRetries = 0,
        int $retryDelayMs = 200,
        ?HttpTransport $transport = null,
        int $timeoutSeconds = 30
    ) {
        $this->baseUrl = self::normalizeBaseUrl($baseUrl);
        $this->apiKey = $apiKey;
        $this->providers = $providers;
        $this->maxRetries = max(0, $maxRetries);
        $this->retryDelayMs = max(1, $retryDelayMs);
        $this->transport = $transport ?? new CurlHttpTransport();
        if ($timeoutSeconds < 1) {
            throw new \InvalidArgumentException('timeoutSeconds must be a positive integer');
        }
        $this->timeoutSeconds = $timeoutSeconds;
    }

    /**
     * Creates a payment.
     *
     * ```php
     * $payment = $client->createPayment(new CreatePaymentParams(
     *     provider: 'paymob',
     *     amountMinorUnits: 1000,
     *     currency: 'EGP',
     *     customer: new CustomerDetails(phone: '+201234567890'),
     * ));
     * ```
     *
     * @param CreatePaymentParams $params
     * @param string|null $idempotencyKey Stable idempotency key
     * @param array<string, mixed>|null $providers Per-call override for provider credentials
     * @return Payment
     */
    public function createPayment(
        CreatePaymentParams $params,
        ?string $idempotencyKey = null,
        ?array $providers = null
    ): Payment {
        if ($params->amountMinorUnits < 1 || $params->amountMinorUnits > 1_000_000_000) {
            throw new \InvalidArgumentException('amountMinorUnits must be between 1 and 1000000000');
        }
        $idempotencyKey ??= self::generateIdempotencyKey();
        self::validateIdempotencyKey($idempotencyKey);
        $mergedProviders = self::mergeProviders($this->providers, $providers);
        $headers = [
            'Idempotency-Key' => $idempotencyKey,
        ];

        // Paymob headers
        if (!empty($mergedProviders['paymob']['secret_key'])) {
            $headers['X-Paymob-Secret-Key'] = (string) $mergedProviders['paymob']['secret_key'];
        }
        if (!empty($mergedProviders['paymob']['public_key'])) {
            $headers['X-Paymob-Public-Key'] = (string) $mergedProviders['paymob']['public_key'];
        }
        if (!empty($mergedProviders['paymob']['hmac_secret'])) {
            $headers['X-Paymob-Hmac-Secret'] = (string) $mergedProviders['paymob']['hmac_secret'];
        }
        if (!empty($mergedProviders['paymob']['integration_id'])) {
            $headers['X-Paymob-Integration-Id'] = (string) $mergedProviders['paymob']['integration_id'];
        }
        if (!empty($mergedProviders['paymob']['base_url'])) {
            $headers['X-Paymob-Base-Url'] = (string) $mergedProviders['paymob']['base_url'];
        }

        // Fawry headers
        if (!empty($mergedProviders['fawry']['merchant_code'])) {
            $headers['X-Fawry-Merchant-Code'] = (string) $mergedProviders['fawry']['merchant_code'];
        }
        if (!empty($mergedProviders['fawry']['secure_key'])) {
            $headers['X-Fawry-Secure-Key'] = (string) $mergedProviders['fawry']['secure_key'];
        }
        if (!empty($mergedProviders['fawry']['base_url'])) {
            $headers['X-Fawry-Base-Url'] = (string) $mergedProviders['fawry']['base_url'];
        }

        // Stripe headers
        if (!empty($mergedProviders['stripe']['secret_key'])) {
            $headers['X-Stripe-Secret-Key'] = (string) $mergedProviders['stripe']['secret_key'];
        }

        $wire = $this->request('POST', '/v1/payments', $params->toWire(), $headers);
        return Payment::fromWire($wire);
    }

    public function getPayment(string $paymentId): Payment
    {
        if ($paymentId === '') {
            throw new \InvalidArgumentException('paymentId must not be empty');
        }
        $wire = $this->request('GET', '/v1/payments/' . rawurlencode($paymentId), null, []);
        return Payment::fromWire($wire);
    }

    private static function normalizeBaseUrl(string $baseUrl): string
    {
        $parts = parse_url($baseUrl);
        if (
            $parts === false
            || !isset($parts['scheme'], $parts['host'])
            || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)
            || isset($parts['user'])
            || isset($parts['pass'])
        ) {
            throw new \InvalidArgumentException('baseUrl must be an absolute HTTP(S) URL without embedded credentials');
        }
        if (isset($parts['query']) || isset($parts['fragment'])) {
            throw new \InvalidArgumentException('baseUrl must not contain a query string or fragment');
        }
        return rtrim($baseUrl, '/');
    }

    private static function validateIdempotencyKey(string $value): void
    {
        if (strlen($value) < 1 || strlen($value) > 200 || preg_match('/^[!#-~]+$/D', $value) !== 1) {
            throw new \InvalidArgumentException(
                'idempotencyKey must be 1-200 printable ASCII characters without quotes or whitespace'
            );
        }
    }

    /**
     * @param array<string, mixed>|null $defaults
     * @param array<string, mixed>|null $overrides
     * @return array<string, mixed>
     */
    private static function mergeProviders(?array $defaults, ?array $overrides): array
    {
        $merged = array_replace($defaults ?? [], $overrides ?? []);
        foreach (['paymob', 'fawry', 'stripe'] as $provider) {
            $baseProvider = $defaults[$provider] ?? null;
            $overrideProvider = $overrides[$provider] ?? null;
            if (is_array($baseProvider) || is_array($overrideProvider)) {
                $merged[$provider] = array_replace(
                    is_array($baseProvider) ? $baseProvider : [],
                    is_array($overrideProvider) ? $overrideProvider : [],
                );
            }
        }
        return $merged;
    }

    private static function generateIdempotencyKey(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }

    /**
     * @param string $method
     * @param string $path
     * @param array<string, mixed>|null $body
     * @param array<string, string> $extraHeaders
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $body, array $extraHeaders): array
    {
        $headers = array_merge(
            ['Content-Type' => 'application/json'],
            $this->apiKey !== null ? [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'X-API-Key' => $this->apiKey
            ] : [],
            $extraHeaders,
        );
        $encodedBody = $body !== null ? json_encode($body, JSON_THROW_ON_ERROR) : null;

        $attempt = 0;
        $maxAttempts = $this->maxRetries + 1;

        while ($attempt < $maxAttempts) {
            try {
                $response = $this->transport->send(
                    $method,
                    $this->urlFor($path),
                    $headers,
                    $encodedBody,
                    $this->timeoutSeconds,
                );
            } catch (\Throwable $e) {
                $attempt++;
                if ($attempt >= $maxAttempts) {
                    if ($e instanceof TransportException && $e->timedOut) {
                        throw new GatewayTimeoutException(
                            "OpenWrapper gateway request timed out after {$this->timeoutSeconds} seconds"
                        );
                    }
                    throw new GatewayUnreachableException(
                        "could not reach OpenWrapper gateway at {$this->baseUrl}: {$e->getMessage()}"
                    );
                }
                $ceilingUs = ($this->retryDelayMs * 1000) * (2 ** ($attempt - 1));
                $sleepUs = random_int(0, (int) $ceilingUs);
                usleep($sleepUs);
                continue;
            }

            $decoded = json_decode($response->body, true);

            if ($response->statusCode >= 200 && $response->statusCode < 300) {
                if (!is_array($decoded)) {
                    throw new GatewayUnreachableException('OpenWrapper gateway returned a non-JSON success response');
                }
                return $decoded;
            }

            if (is_array($decoded) && isset($decoded['error']['code'], $decoded['error']['message'])) {
                throw ExceptionFactory::fromCode(
                    (string) $decoded['error']['code'],
                    (string) $decoded['error']['message'],
                    $response->statusCode,
                );
            }

            throw new GatewayUnreachableException("OpenWrapper gateway returned HTTP {$response->statusCode}");
        }

        throw new GatewayUnreachableException("could not reach OpenWrapper gateway at {$this->baseUrl}");
    }

    private function urlFor(string $path): string
    {
        if (str_ends_with($this->baseUrl, '/v1') && str_starts_with($path, '/v1/')) {
            return $this->baseUrl . substr($path, 3);
        }
        return $this->baseUrl . $path;
    }
}
