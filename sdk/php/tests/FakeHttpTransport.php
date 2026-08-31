<?php

declare(strict_types=1);

namespace OpenWrapper\Tests;

use OpenWrapper\Http\HttpTransport;
use OpenWrapper\Http\TransportResponse;

final class FakeHttpTransport implements HttpTransport
{
    /** @var array{method: string, url: string, headers: array<string,string>, body: ?string}|null */
    public ?array $lastRequest = null;

    public function __construct(
        private readonly int $responseStatus,
        private readonly string $responseBody,
    ) {
    }

    public function send(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds): TransportResponse
    {
        $this->lastRequest = ['method' => $method, 'url' => $url, 'headers' => $headers, 'body' => $body];
        return new TransportResponse($this->responseStatus, $this->responseBody);
    }
}

final class ThrowingHttpTransport implements HttpTransport
{
    public function send(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds): TransportResponse
    {
        throw new \RuntimeException('ECONNREFUSED');
    }
}

final class RetryingHttpTransport implements HttpTransport
{
    public int $calls = 0;

    public function __construct(
        private readonly int $failuresBeforeSuccess,
        private readonly int $responseStatus = 200,
        private readonly string $responseBody = '{}',
    ) {
    }

    public function send(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds): TransportResponse
    {
        $this->calls++;
        if ($this->calls <= $this->failuresBeforeSuccess) {
            throw new \RuntimeException('ECONNRESET');
        }
        return new TransportResponse($this->responseStatus, $this->responseBody);
    }
}
