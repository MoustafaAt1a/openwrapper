<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class ConfigurationException extends OpenWrapperException
{
    public function code(): string
    {
        return "configuration_error";
    }
}
