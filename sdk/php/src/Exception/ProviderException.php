<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class ProviderException extends OpenWrapperException
{
    public function code(): string
    {
        return "provider_error";
    }
}
