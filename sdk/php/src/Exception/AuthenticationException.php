<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class AuthenticationException extends OpenWrapperException
{
    public function code(): string
    {
        return "authentication_error";
    }
}
