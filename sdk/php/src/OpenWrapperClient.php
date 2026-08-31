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
    private readonly int $maxRetries;
    private readonly int $retryDelayMs;
    private readonly HttpTransport $transport;
    private readonly int $timeoutSeconds;

    public function __construct(
        string $baseUrl,
        ?string $apiKey = null,
        int $maxRetries = 0,
        int $retryDelayMs = 200,
        ?HttpTransport $transport = null,
        int $timeoutSeconds = 30
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
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
     * A `$payment->status` of `PaymentStatus::Unknown` is a normal,
     * non-exceptional result — it means the true outcome could not be
     * determined (e.g. a timeout talking to the provider), not that the
     * call failed. Poll `getPayment($payment->paymentId)` to check for
     * resolution; do not call `createPayment()` again with a new
     * idempotency key to "retry" it, since that could double-charge the
     * customer if the original attempt did in fact succeed (invariant I6).
     *
     * @param string|null $idempotencyKey Uniquely identifies this logical
     *     create-payment operation for OpenWrapper's idempotency contract
     *     (see docs/IDEMPOTENCY.md). If omitted, the SDK generates a fresh
     *     one, which is safe for a single call but does **not** protect
     *     you across separate retries from a new process (e.g. a queue
     *     worker retrying a failed job) — pass your own stable key (such
     *     as your own order id) when you need that.
     */
    public function createPayment(CreatePaymentParams $params, ?string $idempotencyKey = null): Payment
    {
        $idempotencyKey ??= self::generateIdempotencyKey();
        $wire = $this->request('POST', '/v1/payments', $params->toWire(), [
            'Idempotency-Key' => $idempotencyKey,
        ]);
        return Payment::fromWire($wire);
    }

    public function getPayment(string $paymentId): Payment
    {
        $wire = $this->request('GET', '/v1/payments/' . rawurlencode($paymentId), null, []);
        return Payment::fromWire($wire);
    }

    private static function generateIdempotencyKey(): string
    {
        // A v4 UUID built from PHP's CSPRNG. No dependency on ext-uuid or
        // a third-party package for something this small (§21).
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
     * @param array<string, mixed>|null $body
     * @param array<string, string> $extraHeaders
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $body, array $extraHeaders): array
    {
        $headers = array_merge(
            ['Content-Type' => 'application/json'],
            $this->apiKey !== null ? ['X-API-Key' => $this->apiKey] : [],
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
