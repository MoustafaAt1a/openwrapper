<?php

declare(strict_types=1);

namespace OpenWrapper;

/**
 * What the customer needs to do next to complete payment. Mirrors
 * `openwrapper_core::PaymentNextAction` — see that type's doc comment for
 * why this is two variants rather than one generic "checkout URL" shape.
 */
abstract class PaymentNextAction
{
    /** @param array<string, mixed>|null $wire */
    public static function fromWire(?array $wire): ?self
    {
        if ($wire === null) {
            return null;
        }
        return match ($wire['type'] ?? null) {
            'redirect_to_url' => new RedirectToUrl($wire['url']),
            'pay_at_reference' => new PayAtReference($wire['reference'], $wire['instructions'] ?? null),
            default => throw new \UnexpectedValueException(
                'unrecognized next_action type: ' . ($wire['type'] ?? '(missing)')
            ),
        };
    }
}

final class RedirectToUrl extends PaymentNextAction
{
    public function __construct(public readonly string $url)
    {
    }
}

final class PayAtReference extends PaymentNextAction
{
    public function __construct(
        public readonly string $reference,
        public readonly ?string $instructions,
    ) {
    }
}
