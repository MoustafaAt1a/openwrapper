<?php

declare(strict_types=1);

namespace OpenWrapper\Http;

final class TransportException extends \RuntimeException
{
    public function __construct(string $message, public readonly bool $timedOut = false)
    {
        parent::__construct($message);
    }
}
