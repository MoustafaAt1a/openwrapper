<?php

declare(strict_types=1);

namespace OpenWrapper;

final class CreatePaymentParams
{
    /**
     * @param string $provider Which provider adapter to use, e.g.
     *     `"paymob"` or `"fawry"`. Chosen explicitly by the caller —
     *     OpenWrapper v0.1.0 does not do smart routing between providers.
     * @param int $amountMinorUnits Integer minor units (piasters for EGP)
     *     — never a floating-point amount. 1000 on "EGP" is 10.00 EGP.
     * @param array<string, string> $metadata
     */
    public function __construct(
        public readonly string $provider,
        public readonly int $amountMinorUnits,
        public readonly string $currency,
        public readonly CustomerDetails $customer,
        public readonly ?string $merchantReference = null,
        public readonly ?string $description = null,
        public readonly ?string $returnUrl = null,
        public readonly array $metadata = [],
    ) {
    }

    /** @return array<string, mixed> */
    public function toWire(): array
    {
        return array_filter([
            'provider' => $this->provider,
            'amount_minor_units' => $this->amountMinorUnits,
            'currency' => $this->currency,
            'customer' => $this->customer->toWire(),
            'merchant_reference' => $this->merchantReference,
            'description' => $this->description,
            'return_url' => $this->returnUrl,
            'metadata' => empty($this->metadata) ? (object) [] : $this->metadata,
        ], static fn($v) => $v !== null);
    }
}
