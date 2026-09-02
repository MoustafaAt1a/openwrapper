<?php

declare(strict_types=1);

namespace OpenWrapper;

final class RedirectToUrl extends PaymentNextAction
{
    public function __construct(public readonly string $url)
    {
    }
}
