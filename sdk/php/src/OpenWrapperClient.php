<?php

declare(strict_types=1);

namespace OpenWrapper;

use OpenWrapper\Exception\ExceptionFactory;
use OpenWrapper\Exception\GatewayUnreachableException;
use OpenWrapper\Http\CurlHttpTransport;
use OpenWrapper\Http\HttpTransport;

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
     * @param string $baseUrl Base URL of OpenWrapper (e.g. 'https://web-production-884cd.up.railway.app')
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
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->providers = $providers;
        $this->maxRetries = max(0, $maxRetries);
        $this->retryDelayMs = max(1, $retryDelayMs);
        $this->transport = $transport ?? new CurlHttpTransport();
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
        $idempotencyKey ??= self::generateIdempotencyKey();
        $mergedProviders = array_merge($this->providers ?? [], $providers ?? []);
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
        $wire = $this->request('GET', '/v1/payments/' . rawurlencode($paymentId), null, []);
        return Payment::fromWire($wire);
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
                    $this->baseUrl . $path,
                    $headers,
                    $encodedBody,
                    $this->timeoutSeconds,
                );
            } catch (\Throwable $e) {
                $attempt++;
                if ($attempt >= $maxAttempts) {
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
}
