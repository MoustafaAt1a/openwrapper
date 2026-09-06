<?php

declare(strict_types=1);

namespace OpenWrapper;

final class Refund
{
    public function __construct(
        public readonly string $id,
        public readonly string $paymentId,
        public readonly int $amountMinorUnits,
        public readonly string $currency,
        public readonly RefundStatus $status,
        public readonly ?string $reason,
        public readonly ?string $providerRefundRef,
        public readonly int $createdAt,
    ) {
    }

    /** @param array<string, mixed> $wire */
    public static function fromWire(array $wire): self
    {
        return new self(
            id: (string) ($wire['id'] ?? ''),
            paymentId: (string) ($wire['payment_id'] ?? ''),
            amountMinorUnits: (int) ($wire['amount_minor_units'] ?? 0),
            currency: (string) ($wire['currency'] ?? ''),
            status: RefundStatus::from((string) ($wire['status'] ?? 'pending')),
            reason: isset($wire['reason']) && $wire['reason'] !== null ? (string) $wire['reason'] : null,
            providerRefundRef: isset($wire['provider_refund_ref']) && $wire['provider_refund_ref'] !== null
                ? (string) $wire['provider_refund_ref']
                : null,
            createdAt: (int) ($wire['created_at'] ?? 0),
        );
    }
}
