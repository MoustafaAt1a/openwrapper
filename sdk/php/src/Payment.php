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
            paymentId: (string) ($wire['payment_id'] ?? ''),
            provider: (string) ($wire['provider'] ?? ''),
            providerReference: isset($wire['provider_reference']) && $wire['provider_reference'] !== null
                ? (string) $wire['provider_reference']
                : null,
            status: PaymentStatus::from((string) ($wire['status'] ?? 'unknown')),
            amountMinorUnits: (int) ($wire['amount_minor_units'] ?? 0),
            currency: (string) ($wire['currency'] ?? ''),
            merchantReference: isset($wire['merchant_reference']) && $wire['merchant_reference'] !== null
                ? (string) $wire['merchant_reference']
                : null,
            nextAction: PaymentNextAction::fromWire($wire['next_action'] ?? null),
        );
    }
}
