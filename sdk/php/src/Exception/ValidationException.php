<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class ValidationException extends OpenWrapperException
{
    public function code(): string
    {
        return "validation_error";
    }
}
