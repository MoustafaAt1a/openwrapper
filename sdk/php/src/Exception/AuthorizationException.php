<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class AuthorizationException extends OpenWrapperException
{
    public function code(): string
    {
        return "authorization_error";
    }
}
