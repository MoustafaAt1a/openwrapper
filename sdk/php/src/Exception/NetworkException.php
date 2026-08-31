<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class NetworkException extends OpenWrapperException
{
    public function code(): string
    {
        return "network_error";
    }
}
