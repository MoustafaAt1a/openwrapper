<?php

declare(strict_types=1);

namespace OpenWrapper;

final class Event
{
    /**
     * @param string $id
     * @param string|null $userId
     * @param string $eventType
     * @param string $resourceId
     * @param array<string, mixed> $payload
     * @param int $createdAt
     */
    public function __construct(
        public readonly string $id,
        public readonly ?string $userId,
        public readonly string $eventType,
        public readonly string $resourceId,
        public readonly array $payload,
        public readonly int $createdAt,
    ) {
    }

    /** @param array<string, mixed> $wire */
    public static function fromWire(array $wire): self
    {
        return new self(
            id: (string) ($wire['id'] ?? ''),
            userId: isset($wire['user_id']) && $wire['user_id'] !== null ? (string) $wire['user_id'] : null,
            eventType: (string) ($wire['event_type'] ?? ''),
            resourceId: (string) ($wire['resource_id'] ?? ''),
            payload: is_array($wire['payload'] ?? null) ? $wire['payload'] : [],
            createdAt: (int) ($wire['created_at'] ?? 0),
        );
    }
}
