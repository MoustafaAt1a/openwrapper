<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

/** A client-side deadline elapsed while waiting for the OpenWrapper gateway. */
final class GatewayTimeoutException extends OpenWrapperException
{
    public function __construct(string $message)
    {
        parent::__construct($message, 0);
    }

    public function code(): string
    {
        return 'gateway_timeout';
    }
}
