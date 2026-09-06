<?php

declare(strict_types=1);

namespace OpenWrapper;

final class WebhookEndpoint
{
    /**
     * @param string $id
     * @param string|null $userId
     * @param string $url
     * @param string|null $secret
     * @param string[] $events
     * @param bool $isActive
     * @param int $createdAt
     */
    public function __construct(
        public readonly string $id,
        public readonly ?string $userId,
        public readonly string $url,
        public readonly ?string $secret,
        public readonly array $events,
        public readonly bool $isActive,
        public readonly int $createdAt,
    ) {
    }

    /** @param array<string, mixed> $wire */
    public static function fromWire(array $wire): self
    {
        return new self(
            id: (string) ($wire['id'] ?? ''),
            userId: isset($wire['user_id']) && $wire['user_id'] !== null ? (string) $wire['user_id'] : null,
            url: (string) ($wire['url'] ?? ''),
            secret: isset($wire['secret']) && $wire['secret'] !== null ? (string) $wire['secret'] : null,
            events: is_array($wire['events'] ?? null) ? array_values(array_map('strval', $wire['events'])) : [],
            isActive: (bool) ($wire['is_active'] ?? true),
            createdAt: (int) ($wire['created_at'] ?? 0),
        );
    }
}
