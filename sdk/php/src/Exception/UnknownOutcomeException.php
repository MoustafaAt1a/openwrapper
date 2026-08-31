<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class UnknownOutcomeException extends OpenWrapperException
{
    public function code(): string
    {
        return "unknown_outcome";
    }
}
