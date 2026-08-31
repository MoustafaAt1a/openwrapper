<?php

declare(strict_types=1);

namespace OpenWrapper\Http;

interface HttpTransport
{
    /**
     * @param array<string, string> $headers
     * @throws \RuntimeException if the request could not be sent at all
     *     (DNS failure, connection refused, etc.) — a transport-level
     *     failure, distinct from the server returning a non-2xx response.
     */
    public function send(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds): TransportResponse;
}
