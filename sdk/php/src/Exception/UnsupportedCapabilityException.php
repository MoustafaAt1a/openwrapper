<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class UnsupportedCapabilityException extends OpenWrapperException
{
    public function code(): string
    {
        return "unsupported_capability";
    }
}
