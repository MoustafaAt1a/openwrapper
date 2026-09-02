<?php

declare(strict_types=1);

namespace OpenWrapper;

final class PayAtReference extends PaymentNextAction
{
    public function __construct(
        public readonly string $reference,
        public readonly ?string $instructions,
    ) {
    }
}
