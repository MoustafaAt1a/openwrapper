<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

/**
 * A transport-level failure talking to the OpenWrapper gateway itself —
 * DNS, connection refused, TLS failure, etc. Distinct from
 * `ProviderException`, which means the gateway was reached but a
 * *provider* returned an error.
 */
final class GatewayUnreachableException extends OpenWrapperException
{
    public function __construct(string $message)
    {
        parent::__construct($message, 0);
    }

    public function code(): string
    {
        return 'gateway_unreachable';
    }
}
