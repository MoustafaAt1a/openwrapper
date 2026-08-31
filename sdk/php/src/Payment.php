<?php

declare(strict_types=1);

namespace OpenWrapper;

final class Payment
{
    public function __construct(
        public readonly string $paymentId,
        public readonly string $provider,
        public readonly ?string $providerReference,
        public readonly PaymentStatus $status,
        public readonly int $amountMinorUnits,
        public readonly string $currency,
        public readonly ?string $merchantReference,
        public readonly ?PaymentNextAction $nextAction = null,
    ) {
    }

    /** @param array<string, mixed> $wire */
    public static function fromWire(array $wire): self
    {
        return new self(
            paymentId: $wire['payment_id'],
            provider: $wire['provider'],
            providerReference: $wire['provider_reference'],
            status: PaymentStatus::from($wire['status']),
            amountMinorUnits: $wire['amount_minor_units'],
            currency: $wire['currency'],
            merchantReference: $wire['merchant_reference'],
            nextAction: PaymentNextAction::fromWire($wire['next_action'] ?? null),
        );
    }
}
