<?php

declare(strict_types=1);

namespace OpenWrapper\Exception;

final class TimeoutException extends OpenWrapperException
{
    public function code(): string
    {
        return "timeout";
    }
}
