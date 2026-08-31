<?php

declare(strict_types=1);

namespace OpenWrapper;

final class CustomerDetails
{
    /** @param string $phone Required by both integrated providers. */
    public function __construct(
        public readonly string $phone,
        public readonly ?string $email = null,
        public readonly ?string $fullName = null,
    ) {
    }

    /** @return array<string, string|null> */
    public function toWire(): array
    {
        return [
            'phone' => $this->phone,
            'email' => $this->email,
            'full_name' => $this->fullName,
        ];
    }
}
