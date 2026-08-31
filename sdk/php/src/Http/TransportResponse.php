<?php

declare(strict_types=1);

namespace OpenWrapper\Http;

final class TransportResponse
{
    public function __construct(
        public readonly int $statusCode,
        public readonly string $body,
    ) {
    }
}
