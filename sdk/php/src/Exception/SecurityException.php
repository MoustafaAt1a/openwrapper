<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class SecurityException extends OpenWrapperException
{
    public function code(): string
    {
        return "security_error";
    }
}
