<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class IdempotencyConflictException extends OpenWrapperException
{
    public function code(): string
    {
        return "idempotency_conflict";
    }
}
