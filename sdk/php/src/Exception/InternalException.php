<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class InternalException extends OpenWrapperException
{
    public function code(): string
    {
        return "internal_error";
    }
}
